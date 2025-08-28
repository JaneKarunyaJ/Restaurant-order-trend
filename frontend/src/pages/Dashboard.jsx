import React, { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { metrics } from '../lib/api'
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts'

function formatDate(d){ return new Date(d).toLocaleDateString() }

export default function Dashboard(){
  const { id } = useParams()
  const [range,setRange]=useState({start:'2025-06-22', end:'2025-06-28'})
  const [filters,setFilters]=useState({amount_min:'0',amount_max:'999999',hour_min:'0',hour_max:'10'})
  const [data,setData]=useState({daily:[], top3:[]})
  const [loading,setLoading]=useState(false)

  const fetchMetrics = async () => {
    setLoading(true)
    const resp = await metrics({restaurant_id:id, ...range, ...filters})
    setData(resp)
    setLoading(false)
  }

  useEffect(()=>{ fetchMetrics() },[id, range.start, range.end, filters.amount_min, filters.amount_max, filters.hour_min, filters.hour_max])

  return (
    <div className="container">
      <div className="header">
        <h1>📊 Dashboard – Restaurant #{id}</h1>
      </div>

      <div className="card grid grid-2">
        <div>
          <label>Start Date</label>
          <input type="date" value={range.start} onChange={e=>setRange(r=>({...r,start:e.target.value}))} />
        </div>
        <div>
          <label>End Date</label>
          <input type="date" value={range.end} onChange={e=>setRange(r=>({...r,end:e.target.value}))} />
        </div>
        <div>
          <label>Amount Min</label>
          <input value={filters.amount_min} onChange={e=>setFilters(f=>({...f,amount_min:e.target.value}))} placeholder="e.g. 200" />
        </div>
        <div>
          <label>Amount Max</label>
          <input value={filters.amount_max} onChange={e=>setFilters(f=>({...f,amount_max:e.target.value}))} placeholder="e.g. 900" />
        </div>
        <div>
          <label>Hour Min</label>
          <input value={filters.hour_min} onChange={e=>setFilters(f=>({...f,hour_min:e.target.value}))} placeholder="0–23" />
        </div>
        <div>
          <label>Hour Max</label>
          <input value={filters.hour_max} onChange={e=>setFilters(f=>({...f,hour_max:e.target.value}))} placeholder="0–23" />
        </div>
      </div>

      {loading ? <p>Loading…</p> : (
        <>
          <div className="grid grid-2" style={{marginTop:16}}>
            <div className="card">
              <h3>Daily Orders</h3>
              <LineChart width={500} height={260} data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="orders" />
              </LineChart>
            </div>
            <div className="card">
              <h3>Daily Revenue</h3>
              <BarChart width={500} height={260} data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" />
              </BarChart>
            </div>
          </div>

          <div className="grid grid-2" style={{marginTop:16}}>
            <div className="card">
              <h3>Average Order Value</h3>
              <LineChart width={500} height={260} data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="avg_order_value" />
              </LineChart>
            </div>
            <div className="card">
              <h3>Peak Order Hour per Day</h3>
              <BarChart width={500} height={260} data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0,23]} />
                <Tooltip />
                <Bar dataKey="peak_order_hour" />
              </BarChart>
            </div>
          </div>

          <div className="card" style={{marginTop:16}}>
            <h3>Top 3 Restaurants by Revenue (current filters)</h3>
            <table className="table">
              <thead><tr><th>Restaurant ID</th><th>Revenue</th></tr></thead>
              <tbody>
                {data.top3.map(r => (
                  <tr key={r.restaurant_id}>
                    <td>{r.restaurant_id}</td>
                    <td>₹ {r.revenue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
