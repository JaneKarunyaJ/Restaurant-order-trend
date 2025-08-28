import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listRestaurants } from '../lib/api'

export default function App(){
  const [q,setQ]=useState('')
  const [cuisine,setCuisine]=useState('')
  const [location,setLocation]=useState('')
  const [sort,setSort]=useState('name')
  const [rows,setRows]=useState([])
  const [total,setTotal]=useState(0)
  const [page,setPage]=useState(1)
  const [limit,setLimit]=useState(10)
  const [loading,setLoading]=useState(false)

  const fetchData = async () => {
    setLoading(true)
    const resp = await listRestaurants({q,cuisine,location,sort,page,limit})
    setRows(resp.data ?? [])
    setTotal(resp.total ?? 0)
    setLoading(false)
  }

  useEffect(()=>{ fetchData() },[q,cuisine,location,sort,page,limit])

  return (
    <div className="container">
      <div className="header">
        <h1>🍽️ Restaurant Order Trends</h1>
        <span className="badge">Full-stack • React + PHP</span>
      </div>

      <div className="card grid" style={{gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr'}}>
        <input placeholder="Search name/cuisine/location" value={q} onChange={e=>{setPage(1);setQ(e.target.value)}} />
        <input placeholder="Cuisine" value={cuisine} onChange={e=>{setPage(1);setCuisine(e.target.value)}} />
        <input placeholder="Location" value={location} onChange={e=>{setPage(1);setLocation(e.target.value)}} />
        <select value={sort} onChange={e=>setSort(e.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="location">Sort: Location</option>
          <option value="cuisine">Sort: Cuisine</option>
        </select>
        <select value={limit} onChange={e=>{setPage(1);setLimit(parseInt(e.target.value))}}>
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="25">25</option>
        </select>
      </div>

      <div className="card" style={{marginTop:16}}>
        {loading ? <p>Loading…</p> : (
          <table className="table">
            <thead>
              <tr><th>Name</th><th>Location</th><th>Cuisine</th><th></th></tr>
            </thead>
            <tbody>
              {rows.map(r=> (
                <tr key={r.id}>
                  <td>{r.name}</td>
                  <td>{r.location}</td>
                  <td>{r.cuisine}</td>
                  <td><Link className="link" to={`/dashboard/${r.id}`}>View Dashboard →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Prev</button>
          <span style={{alignSelf:'center'}}>Page {page} / {Math.max(1,Math.ceil(total/limit))}</span>
          <button disabled={page>=Math.ceil(total/limit)} onClick={()=>setPage(p=>p+1)}>Next</button>
        </div>
      </div>
    </div>
  )
}
