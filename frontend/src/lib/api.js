import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export async function listRestaurants(params){
  const { q, cuisine, location, sort='name', page=1, limit=10 } = params
  const resp = await api.get('/restaurants', { params: { q, cuisine, location, sort, page, limit } })
  return resp.data
}

export async function metrics(params){
  const { restaurant_id, start, end, amount_min, amount_max, hour_min, hour_max } = {
    restaurant_id: params.restaurant_id,
    start: params.start_date || params.start,
    end: params.end_date || params.end,
    amount_min: params.amount_min ?? 0,
    amount_max: params.amount_max ?? 0,
    hour_min: params.hour_min ?? 0,
    hour_max: params.hour_max ?? 0
  }
  console.log(amount_max);
  const resp = await api.get('/metrics', { params: {
    restaurant_id, start_date:start, end_date:end, amount_min, amount_max, hour_min, hour_max
  } })
  return resp.data
}
