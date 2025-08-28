<?php
// Simple PHP backend with routing + caching for Restaurant Order Trends
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Helper to send JSON
function send_json($data, $code=200) {
  http_response_code($code);
  header('Content-Type: application/json');
  echo json_encode($data);
  exit;
}

function read_json($file) {
  $raw = file_get_contents($file);
  return json_decode($raw, true);
}

function ensure_date($s) {
  $t = strtotime($s);
  return $t !== false ? date('Y-m-d', $t) : null;
}

// Load datasets
$restaurants = read_json(__DIR__ . '/restaurants.json');
$orders = read_json(__DIR__ . '/orders.json');

// Build maps for convenience
$restaurantMap = [];
foreach ($restaurants as $r) { $restaurantMap[$r['id']] = $r; }

// Caching helpers
function cache_get($key) {
  $file = __DIR__ . '/cache/' . $key . '.json';
  if (file_exists($file)) {
    $raw = file_get_contents($file);
    $obj = json_decode($raw, true);
    if ($obj && isset($obj['ts']) && (time() - $obj['ts'] < 300)) { // 5 min TTL
      return $obj['data'];
    }
  }
  return null;
}
function cache_set($key, $data) {
  $file = __DIR__ . '/cache/' . $key . '.json';
  file_put_contents($file, json_encode([ 'ts' => time(), 'data' => $data ]));
}

// Utilities: filter orders
function filter_orders($orders, $params) {
  $start = isset($params['start_date']) ? strtotime($params['start_date'].' 00:00:00') : null;
  $end   = isset($params['end_date']) ? strtotime($params['end_date'].' 23:59:59') : null;
  $rid   = isset($params['restaurant_id']) ? intval($params['restaurant_id']) : null;
  $amin  = isset($params['amount_min']) ? floatval($params['amount_min']) : null;
  $amax  = isset($params['amount_max']) ? floatval($params['amount_max']) : null;
  $hmin  = isset($params['hour_min']) ? intval($params['hour_min']) : null;
  $hmax  = isset($params['hour_max']) ? intval($params['hour_max']) : null;

  $out = [];
  foreach ($orders as $o) {
    $ts = strtotime($o['order_time']);
    if ($start && $ts < $start) continue;
    if ($end && $ts > $end) continue;
    if (!is_null($rid) && intval($o['restaurant_id']) !== $rid) continue;
    if (!is_null($amin) && $o['order_amount'] < $amin) continue;
    if (!is_null($amax) && $o['order_amount'] > $amax) continue;
    $hr = intval(date('G', $ts));
    if (!is_null($hmin) && $hr < $hmin) continue;
    if (!is_null($hmax) && $hr > $hmax) continue;
    $out[] = $o;
  }
  return $out;
}

// Aggregations per day
function daily_aggregations($orders) {
  $byDay = [];
  foreach ($orders as $o) {
    $d = date('Y-m-d', strtotime($o['order_time']));
    if (!isset($byDay[$d])) $byDay[$d] = ['date'=>$d,'orders'=>0,'revenue'=>0.0,'sum'=>0.0,'peakHour'=>null,'hourCounts'=>[]];
    $byDay[$d]['orders'] += 1;
    $byDay[$d]['revenue'] += $o['order_amount'];
    $byDay[$d]['sum'] += $o['order_amount'];
    $hr = intval(date('G', strtotime($o['order_time'])));
    $byDay[$d]['hourCounts'][$hr] = ($byDay[$d]['hourCounts'][$hr] ?? 0) + 1;
  }
  // finalize: avg + peak
  $rows = [];
  foreach ($byDay as $d => $v) {
    $peakHour = null; $peakCnt = -1;
    foreach ($v['hourCounts'] as $h => $c) {
      if ($c > $peakCnt) { $peakCnt = $c; $peakHour = $h; }
    }
    $rows[] = [
      'date' => $d,
      'orders' => $v['orders'],
      'revenue' => round($v['revenue'], 2),
      'avg_order_value' => round($v['orders'] ? $v['sum'] / $v['orders'] : 0, 2),
      'peak_order_hour' => $peakHour
    ];
  }
  // sort by date
  usort($rows, function($a,$b){ return strcmp($a['date'],$b['date']); });
  return $rows;
}

// Revenue by restaurant
function revenue_by_restaurant($orders) {
  $map = [];
  foreach ($orders as $o) {
    $rid = $o['restaurant_id'];
    $map[$rid] = ($map[$rid] ?? 0) + $o['order_amount'];
  }
  $rows = [];
  foreach ($map as $rid => $rev) { $rows[] = ['restaurant_id'=>$rid,'revenue'=>round($rev,2)]; }
  usort($rows, function($a,$b){ return $b['revenue'] <=> $a['revenue']; });
  return $rows;
}

// Routing
if ($path === '/api/health') {
  send_json(['ok' => true, 'time' => date(DATE_ISO8601)]);
}

if ($path === '/api/restaurants') {
  // search, sort, filter, pagination
  $q = isset($_GET['q']) ? strtolower(trim($_GET['q'])) : '';
  $cuisine = isset($_GET['cuisine']) ? strtolower(trim($_GET['cuisine'])) : null;
  $location = isset($_GET['location']) ? strtolower(trim($_GET['location'])) : null;
  $sort = isset($_GET['sort']) ? $_GET['sort'] : 'name'; // name | location | cuisine
  $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
  $limit = isset($_GET['limit']) ? max(1, intval($_GET['limit'])) : 10;

  $filtered = array_values(array_filter($restaurants, function($r) use ($q,$cuisine,$location) {
    $s = strtolower($r['name'].' '.$r['cuisine'].' '.$r['location']);
    if ($q && strpos($s, $q) === false) return false;
    if ($cuisine && strtolower($r['cuisine']) !== $cuisine) return false;
    if ($location && strtolower($r['location']) !== $location) return false;
    return true;
  }));

  usort($filtered, function($a,$b) use ($sort) { return strcmp(strtolower($a[$sort]), strtolower($b[$sort])); });

  $total = count($filtered);
  $start = ($page - 1) * $limit;
  $paged = array_slice($filtered, $start, $limit);

  send_json(['data'=>$paged, 'page'=>$page, 'limit'=>$limit, 'total'=>$total]);
}

if ($path === '/api/metrics') {
  // cache key
  $key = hash('sha256', $_SERVER['REQUEST_URI']);
  $cached = cache_get($key);
  if ($cached) send_json($cached);

  // figure out default date range if missing
  $allDates = array_column($orders, 'order_time');
  $earliest = min($allDates);
  $latest   = max($allDates);

  $params = [
    'restaurant_id' => $_GET['restaurant_id'] ?? null,
    'start_date' => $_GET['start_date'] ?? date('Y-m-d', strtotime($earliest)),
    'end_date' => $_GET['end_date'] ?? date('Y-m-d', strtotime($latest)),
    'amount_min' => $_GET['amount_min'] ?? null,
    'amount_max' => $_GET['amount_max'] ?? null,
    'hour_min' => $_GET['hour_min'] ?? null,
    'hour_max' => $_GET['hour_max'] ?? null,
  ];

  $f = filter_orders($orders, $params);
  $daily = daily_aggregations($f);
  $top = revenue_by_restaurant($f);
  $resp = ['daily'=>$daily, 'top3'=>array_slice($top,0,3)];
  cache_set($key, $resp);
  send_json($resp);
}

  cache_set($key, $resp);
  send_json($resp);




// Fallback
send_json(['error' => 'Not found', 'path' => $path], 404);
