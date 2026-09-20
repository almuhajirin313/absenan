async function apiGet(action){
 const u=new URL(window.APP_CONFIG.API_URL);u.searchParams.set('action',action);
 const r=await fetch(u);return r.json();
}
async function apiPost(action,data={},token=localStorage.getItem('absen_token')){
 const r=await fetch(window.APP_CONFIG.API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action,...data,token})});
 return r.json();
}
