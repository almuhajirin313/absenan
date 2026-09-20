const app=document.getElementById('app');
let publicData=null,user=JSON.parse(localStorage.getItem('absen_user')||'null');

function shell(content,title='Absensi Digital Al-Muhajirin'){
 app.innerHTML=`<header class="top"><div class="nav"><div class="brand">🟢 ${title}</div><div>${user?`<button onclick="logout()">Keluar</button>`:`<button onclick="showLogin()">Login</button>`}</div></div></header>${content}<footer>© ${new Date().getFullYear()} Al-Muhajirin • Sistem Kehadiran Digital</footer>`;
}
async function home(){
 const d=await apiGet('public'); if(!d.ok){shell(`<main class="container"><div class="error">${d.message}</div></main>`);return}
 publicData=d;
 const cards=d.lembaga.map(l=>{const s=d.summary[l.ID_Lembaga]?.siswa||{total:0,hadir:0,sakit:0,izin:0,alpha:0};const p=s.total?Math.round(s.hadir/s.total*100):0;return `<div class="card stat"><span class="badge">${l.Kode}</span><h3>${l.Nama}</h3><b>${p}%</b><small class="muted">Siswa hadir (${s.hadir}/${s.total})</small></div>`}).join('');
 const acts=(d.activities||[]).map(x=>`<div class="card"><b>${x.Judul}</b><div class="muted">${x.Tanggal||''} ${x.Jam||''}</div><div>${x.Lokasi||''}</div></div>`).join('');
 const running=(d.running||[]).map(x=>x.Teks).join(' • ');
 shell(`<div class="running"><span>${running||'Alhamdulillah, mari tingkatkan kedisiplinan dan kehadiran kita.'}</span></div><main class="container"><section class="hero"><div class="badge">● LIVE MONITORING</div><h1>${d.settings.WELCOME_TITLE||'Selamat Datang'}</h1><p class="muted">${d.settings.WELCOME_TEXT||'Monitoring kehadiran Al-Muhajirin'}</p><h3>${new Date().toLocaleString('id-ID')}</h3></section><h2>📊 Kehadiran Hari Ini</h2><section class="grid">${cards}</section><div class="row" style="margin-top:18px"><div class="card"><h2>📍 Lokasi Sekolah</h2><div class="map">Google Maps siap digunakan setelah API Key dipasang.</div></div><div><h2>📅 Kegiatan Mendatang</h2>${acts||'<div class="card muted">Belum ada kegiatan.</div>'}</div></div></main>`);
}
function showLogin(){
 shell(`<main class="login"><div class="card"><h2>🔐 Login</h2><p class="muted">Guru • Staff TU • Kepala Sekolah • Yayasan</p><form onsubmit="doLogin(event)"><label>Username</label><input id="u" required><br><br><label>Password</label><input id="p" type="password" required><br><br><button>Masuk</button></form><p id="msg"></p></div></main>`);
}
async function doLogin(e){e.preventDefault();const r=await apiPost('login',{username:u.value,password:p.value},'');if(!r.ok){msg.className='error';msg.textContent=r.message;return}localStorage.setItem('absen_token',r.token);localStorage.setItem('absen_user',JSON.stringify(r.user));user=r.user;dashboard();}
function logout(){apiPost('logout',{}).finally(()=>{localStorage.clear();user=null;home()})}
function dashboard(){
 if(!user){home();return}
 const isGuru=user.role==='GURU';
 shell(`<main class="container"><div class="hero" style="text-align:left"><div class="badge">${user.role}</div><h1>Halo, ${user.nama}</h1><p class="muted">Dashboard ${user.lembaga||'Yayasan'}</p></div><section class="grid"><div class="card stat"><span>📍</span><b id="clock">--:--</b><small>Waktu server/perangkat</small></div><div class="card"><h3>📍 Lokasi</h3><p id="loc" class="muted">Belum diperiksa</p><button onclick="getLoc()">Periksa GPS</button></div><div class="card"><h3>📷 Selfie</h3><input id="photo" type="file" accept="image/*" capture="user"></div><div class="card"><h3>📝 Izin</h3><button class="btn secondary" onclick="leaveForm()">Ajukan Izin</button></div></section><div class="card" style="margin-top:18px"><h2>📌 Absensi</h2><p id="attMsg" class="muted">Pastikan GPS berada di area sekolah.</p><button onclick="doAttendance()">ABSEN MASUK / PULANG</button></div></main>`);
 setInterval(()=>{const e=document.getElementById('clock');if(e)e.textContent=new Date().toLocaleTimeString('id-ID')},1000);
}
let geo={};
function getLoc(){navigator.geolocation.getCurrentPosition(p=>{geo={latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy};loc.textContent=`${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)} • akurasi ±${Math.round(geo.accuracy)}m`},e=>{loc.textContent='GPS gagal: '+e.message})}
async function doAttendance(){if(!geo.latitude)getLoc();if(!geo.latitude){attMsg.className='error';attMsg.textContent='Aktifkan GPS terlebih dahulu.';return}let ph='';if(photo.files[0])ph=await fileData(photo.files[0]);const r=await apiPost('attendance',{...geo,photo:ph,photoName:photo.files[0]?.name});attMsg.className=r.ok?'ok':'error';attMsg.textContent=r.message||''}
function fileData(file){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file)})}
function leaveForm(){const t=prompt('Tanggal (YYYY-MM-DD):');if(!t)return;const j=prompt('Jenis: Izin / Sakit / Dinas','Izin');const k=prompt('Keterangan','Keperluan keluarga');apiPost('leave',{tanggal:t,jenis:j,keterangan:k}).then(r=>alert(r.message||'Selesai'))}
if(user)dashboard();else home();
