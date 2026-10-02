/* Pengirim data ke Google Sheet, dipakai index.html dan ioite.html.
   Data disimpan dulu di antrean HP (mi_queue), dikirim, lalu dihapus dari antrean hanya jika berhasil.
   Kalau sinyal putus atau halaman tertutup, data dikirim ulang saat halaman dibuka lagi atau sinyal kembali.
   Setiap data punya id unik, jadi pengiriman ulang tidak membuat baris ganda di Sheet. */
(function(){
  var KEY = "mi_queue";
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || "[]"); }catch(e){ return []; } }
  function save(q){ try{ localStorage.setItem(KEY, JSON.stringify(q.slice(-300))); }catch(e){} }
  function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function drop(id){ save(load().filter(function(x){ return x.id !== id; })); }

  // true = selesai (tidak perlu dikirim ulang), false = coba lagi nanti
  async function post(ep, data){
    var opt = { method:"POST", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(data) };
    try{
      var r = await fetch(ep, opt);
      var j = await r.json();
      return j.ok === true || j.error === "phone"; // "phone" = nomor tidak valid, dikirim ulang pun percuma
    }catch(e){
      // Respons tidak terbaca (CORS atau jaringan). Coba sekali lagi tanpa membaca respons.
      try{ await fetch(ep, Object.assign({ mode:"no-cors" }, opt)); return true; }catch(e2){ return false; }
    }
  }

  // Pindahkan sisa antrean dari versi lama aplikasi
  function migrate(){
    var q = load(), changed = false;
    try{
      var old = localStorage.getItem("mi_pending");
      if(old){ q.push(JSON.parse(old)); localStorage.removeItem("mi_pending"); changed = true; }
      for(var i = localStorage.length - 1; i >= 0; i--){
        var k = localStorage.key(i);
        if(k && k.indexOf("mi_ioite_pending_") === 0){ q.push(JSON.parse(localStorage.getItem(k))); localStorage.removeItem(k); changed = true; }
      }
    }catch(e){}
    q.forEach(function(d){ if(!d.id){ d.id = uid(); changed = true; } });
    if(changed) save(q);
  }

  var flushing = false;
  async function flush(ep){
    if(!ep || flushing || navigator.onLine === false) return;
    flushing = true;
    try{
      migrate();
      var q = load();
      for(var i = 0; i < q.length; i++){ if(await post(ep, q[i])) drop(q[i].id); }
    }finally{ flushing = false; }
  }

  function send(ep, data){
    data.id = data.id || uid();
    var q = load(); q.push(data); save(q);
    return post(ep, data).then(function(ok){ if(ok) drop(data.id); });
  }

  window.MI = { send: send, flush: flush };
  window.addEventListener("online", function(){ if(window.MI.endpoint) flush(window.MI.endpoint); });
})();
