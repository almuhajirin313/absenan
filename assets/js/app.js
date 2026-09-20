
const app=document.getElementById('app');
let publicData=null,user=JSON.parse(localStorage.getItem('absen_user')||'null');
let geo={}, attendanceMap=null, userMarker=null, schoolMarker=null, radiusCircle=null;

function shell(content,title='Absensi Digital Al-Muhajirin'){
 app.innerHTML=`<header class="top"><div class="nav"><div class="brand">🟢 ${title}</div><div>${user?`<button onclick="logout()">Keluar</button>`:`<button onclick="showLogin()">Login</button>`}</div></div></header>${content}<footer>© ${new Date().getFullYear()} Al-Muhajirin • Sistem Kehadiran Digital</footer>`;
}

async function home(){
 const d=await apiGet('public');
 if(!d.ok){shell(`<main class="container"><div class="error">${d.message}</div></main>`);return}
 publicData=d;
 const cards=d.lembaga.map(l=>{
   const s=d.summary[l.ID_Lembaga]?.siswa||{total:0,hadir:0};
   const p=s.total?Math.round(s.hadir/s.total*100):0;
   return `<div class="card stat"><span class="badge">${l.Kode}</span><h3>${l.Nama}</h3><b>${p}%</b><small class="muted">Siswa hadir (${s.hadir}/${s.total})</small></div>`;
 }).join('');
 const acts=(d.activities||[]).map(x=>`<div class="card"><b>${x.Judul}</b><div class="muted">${x.Tanggal||''} ${x.Jam||''}</div><div>${x.Lokasi||''}</div></div>`).join('');
 const running=(d.running||[]).map(x=>x.Teks).join(' • ');
 const mapData=d.lembaga.filter(x=>x.Latitude&&x.Longitude);
 shell(`
 <div class="running"><span>${running||'Alhamdulillah, mari tingkatkan kedisiplinan dan kehadiran kita.'}</span></div>
 <main class="container">
   <section class="hero">
     <div class="badge">● LIVE MONITORING</div>
     <h1>${d.settings.WELCOME_TITLE||'Selamat Datang'}</h1>
     <p class="muted">${d.settings.WELCOME_TEXT||'Monitoring kehadiran Al-Muhajirin'}</p>
     <h3>${new Date().toLocaleString('id-ID')}</h3>
   </section>
   <h2>📊 Kehadiran Hari Ini</h2>
   <section class="grid">${cards}</section>
   <div class="row" style="margin-top:18px">
     <div class="card">
       <h2>🗺️ Lokasi Lembaga</h2>
       <div id="publicMap" class="map"></div>
       <div class="map-legend"><span>📍 Sekolah</span><span>⭕ Zona absensi</span></div>
     </div>
     <div><h2>📅 Kegiatan Mendatang</h2>${acts||'<div class="card muted">Belum ada kegiatan.</div>'}</div>
   </div>
 </main>`);
 initPublicMap(mapData);
}

function initPublicMap(lembaga){
 const el=document.getElementById('publicMap');
 if(!el || typeof L==='undefined') return;
 const fallback=[-6.25,107.15];
 attendanceMap=L.map(el).setView(fallback,12);
 L.tileLayer(window.APP_CONFIG.MAP_TILE_URL,{attribution:window.APP_CONFIG.MAP_ATTRIBUTION,maxZoom:19}).addTo(attendanceMap);
 const points=[];
 lembaga.forEach(l=>{
   const lat=Number(l.Latitude),lon=Number(l.Longitude),radius=Number(l.Radius_M||100);
   if(!isFinite(lat)||!isFinite(lon)) return;
   points.push([lat,lon]);
   L.marker([lat,lon]).addTo(attendanceMap).bindPopup(`<b>${l.Nama}</b><br>Radius absensi ${radius} meter`);
   L.circle([lat,lon],{radius,color:'#2563eb',fillOpacity:.08}).addTo(attendanceMap);
 });
 if(points.length) attendanceMap.fitBounds(points,{padding:[25,25]});
}

function showLogin(){
 shell(`<main class="login"><div class="card"><h2>🔐 Login</h2><p class="muted">Guru • Staff TU • Kepala Sekolah • Yayasan</p>
 <form onsubmit="doLogin(event)"><label>Username</label><input id="u" required><br><br>
 <label>Password</label><input id="p" type="password" required><br><br>
 <button>Masuk</button></form><p id="msg"></p></div></main>`);
}

async function doLogin(e){
 e.preventDefault();
 const r=await apiPost('login',{username:u.value,password:p.value},'');
 if(!r.ok){msg.className='error';msg.textContent=r.message;return}
 localStorage.setItem('absen_token',r.token);
 localStorage.setItem('absen_user',JSON.stringify(r.user));
 user=r.user;dashboard();
}

function logout(){
 apiPost('logout',{}).finally(()=>{localStorage.clear();user=null;home()});
}

function dashboard(){
 if(!user){home();return}
 shell(`<main class="container">
 <div class="hero" style="text-align:left"><div class="badge">${user.role}</div><h1>Halo, ${user.nama}</h1><p class="muted">Dashboard ${user.lembaga||'Yayasan'}</p></div>
 <section class="grid">
   <div class="card stat"><span>🕐</span><b id="clock">--:--</b><small>Waktu perangkat</small></div>
   <div class="card"><h3>📍 Status GPS</h3><p id="loc" class="muted">Belum diperiksa</p><button onclick="getLoc()">Gunakan Lokasi Saya</button></div>
   <div class="card"><h3>📷 Selfie</h3><input id="photo" type="file" accept="image/*" capture="user"></div>
   <div class="card"><h3>📝 Izin</h3><button class="btn secondary" onclick="leaveForm()">Ajukan Izin</button></div>
 </section>
 <div class="card" style="margin-top:18px">
   <h2>🗺️ Peta Absensi</h2>
   <div id="attendanceMap"></div>
   <div id="mapStatus" class="map-status">Tekan "Gunakan Lokasi Saya" untuk memeriksa posisi.</div>
   <div class="map-legend"><span>🔵 Sekolah</span><span>⭕ Radius yang diizinkan</span><span>🔴 Posisi Anda</span></div>
 </div>
 <div class="card" style="margin-top:18px">
   <h2>📌 Absensi</h2><p id="attMsg" class="muted">Pastikan GPS berada di area sekolah.</p>
   <button onclick="doAttendance()">ABSEN MASUK / PULANG</button>
 </div>
 </main>`);
 setInterval(()=>{const e=document.getElementById('clock');if(e)e.textContent=new Date().toLocaleTimeString('id-ID')},1000);
 setTimeout(initAttendanceMap,50);
}

function initAttendanceMap(){
 const el=document.getElementById('attendanceMap');
 if(!el || typeof L==='undefined') return;
 const lemb=(publicData?.lembaga||[]).filter(x=>x.Latitude&&x.Longitude);
 const fallback=lemb.length?[Number(lemb[0].Latitude),Number(lemb[0].Longitude)]:[-6.25,107.15];
 attendanceMap=L.map(el).setView(fallback,16);
 L.tileLayer(window.APP_CONFIG.MAP_TILE_URL,{attribution:window.APP_CONFIG.MAP_ATTRIBUTION,maxZoom:19}).addTo(attendanceMap);
 lemb.forEach(l=>{
   const lat=Number(l.Latitude),lon=Number(l.Longitude),radius=Number(l.Radius_M||100);
   L.marker([lat,lon]).addTo(attendanceMap).bindPopup(`<b>${l.Nama}</b><br>Zona absensi ${radius} meter`);
   L.circle([lat,lon],{radius,color:'#2563eb',fillOpacity:.08}).addTo(attendanceMap);
 });
}

function getLoc(){
 if(!navigator.geolocation){
   updateMapStatus('Perangkat tidak mendukung GPS.','outside'); return;
 }
 updateMapStatus('Mengambil lokasi GPS...','');
 navigator.geolocation.getCurrentPosition(async p=>{
   geo={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};
   if(userMarker) userMarker.remove();
   userMarker=L.marker([geo.latitude,geo.longitude]).addTo(attendanceMap).bindPopup('📍 Posisi Anda').openPopup();
   attendanceMap.setView([geo.latitude,geo.longitude],17);
   loc.textContent=`${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)} • akurasi ±${Math.round(geo.accuracy)}m`;
   await checkGeofence();
 },e=>{
   updateMapStatus('GPS gagal: '+e.message,'outside');
   loc.textContent='GPS gagal: '+e.message;
 },{enableHighAccuracy:true,timeout:15000,maximumAge:0});
}

async function checkGeofence(){
 // Public API returns the coordinates of all active institutions.
 const d=publicData || await apiGet('public');
 let nearest=null;
 (d.lembaga||[]).forEach(l=>{
   if(!l.Latitude||!l.Longitude) return;
   const dist=distanceM(geo.latitude,geo.longitude,Number(l.Latitude),Number(l.Longitude));
   const radius=Number(l.Radius_M||100);
   if(!nearest||dist<nearest.dist) nearest={l,dist,radius};
 });
 if(!nearest){updateMapStatus('Koordinat sekolah belum diatur oleh admin.','outside');return}
 const inside=nearest.dist<=nearest.radius;
 updateMapStatus(
   `${inside?'✅':'❌'} ${nearest.l.Nama}: jarak ${Math.round(nearest.dist)} m dari sekolah. Radius ${nearest.radius} m.`,
   inside?'inside':'outside'
 );
}

function distanceM(lat1,lon1,lat2,lon2){
 const R=6371000,p=Math.PI/180;
 const a=0.5-Math.cos((lat2-lat1)*p)/2+
   Math.cos(lat1*p)*Math.cos(lat2*p)*(1-Math.cos((lon2-lon1)*p))/2;
 return 2*R*Math.asin(Math.sqrt(a));
}

function updateMapStatus(text,cls){
 const e=document.getElementById('mapStatus');
 if(e){e.textContent=text;e.className='map-status '+(cls||'');}
}

async function doAttendance(){
 if(!geo.latitude){getLoc();return}
 let ph='';
 if(photo.files[0]) ph=await fileData(photo.files[0]);
 attMsg.className='muted';attMsg.textContent='Memvalidasi lokasi dan menyimpan absensi...';
 const r=await apiPost('attendance',{...geo,photo:ph,photoName:photo.files[0]?.name});
 attMsg.className=r.ok?'ok':'error';attMsg.textContent=r.message||'';
 if(r.distance!==undefined) updateMapStatus(`${r.ok?'✅':'❌'} ${r.message} Jarak ${r.distance} meter.`,r.ok?'inside':'outside');
}

function fileData(file){
 return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})
}
function leaveForm(){
 const t=prompt('Tanggal (YYYY-MM-DD):');if(!t)return;
 const j=prompt('Jenis: Izin / Sakit / Dinas','Izin');
 const k=prompt('Keterangan','Keperluan keluarga');
 apiPost('leave',{tanggal:t,jenis:j,keterangan:k}).then(r=>alert(r.message||'Selesai'));
}

if(user)dashboard();else home();
