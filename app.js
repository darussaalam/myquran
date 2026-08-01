document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNavigation();
    initLocationAndPrayer();
    initQuran();
    initHadist();
    initDoa();
    initIbadahTracker();
    initMuslimah();
    initKitab();
});

function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (show) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
}

// --- THEME ---
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const body = document.body;
    
    if (localStorage.getItem('myquran_theme') === 'light') {
        body.classList.remove('dark-mode');
        btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        body.classList.add('dark-mode');
        btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    btn.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
            localStorage.setItem('myquran_theme', 'dark');
        } else {
            btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
            localStorage.setItem('myquran_theme', 'light');
        }
    });
}

// --- LOCATION & PRAYER TIMES ---
function initLocationAndPrayer() {
    const container = document.getElementById('prayer-times-container');
    const hijriText = document.getElementById('hijri-text');

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                try {
                    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=20`);
                    const json = await res.json();
                    if (json.code === 200) {
                        displayPrayerTimes(json.data.timings);
                        const hijri = json.data.date.hijri;
                        hijriText.innerText = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;
                    }
                } catch (error) {
                    container.innerHTML = '<p class="text-bold">GAGAL MEMUAT JADWAL</p>';
                }
            },
            (error) => {
                container.innerHTML = '<p class="text-bold text-red">LOKASI DITOLAK</p>';
            }
        );
    }
}

function displayPrayerTimes(timings) {
    const container = document.getElementById('prayer-times-container');
    container.innerHTML = '';
    
    const prayers = [
        { id: 'Fajr', name: 'Subuh' },
        { id: 'Dhuhr', name: 'Dzuhur' },
        { id: 'Asr', name: 'Ashar' },
        { id: 'Maghrib', name: 'Maghrib' },
        { id: 'Isha', name: 'Isya' }
    ];

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let nextPrayerFound = false;

    prayers.forEach(p => {
        const timeStr = timings[p.id];
        const [h, m] = timeStr.split(':').map(Number);
        const prayerMinutes = h * 60 + m;
        
        let isNext = false;
        if (!nextPrayerFound && prayerMinutes > currentMinutes) {
            isNext = true;
            nextPrayerFound = true;
        }

        const div = document.createElement('div');
        div.className = `prayer-time-item ${isNext ? 'next' : ''}`;
        div.innerHTML = `
            <span class="prayer-name">${p.name}</span>
            <span class="prayer-clock">${timeStr}</span>
        `;
        container.appendChild(div);
    });
}

// --- NAVIGATION ---
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            const targetId = btn.getAttribute('data-target');
            document.querySelectorAll(`.nav-btn[data-target="${targetId}"]`).forEach(b => b.classList.add('active'));

            tabPanes.forEach(pane => pane.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');
            document.querySelector('.content-container').scrollTop = 0;
            
            if (document.body.classList.contains('mushaf-active')) {
                toggleMushafMode(false);
            }
        });
    });
}

// --- QURAN & CUSTOM AUDIO PLAYER ---
const QURAN_API = 'https://equran.id/api/v2';
let currentAudioUrl = '';
let currentSurahName = '';
let currentBaseFontSize = 3.0; 

// Audio Player DOM
const audioEl = document.getElementById('global-audio');
const playerContainer = document.getElementById('custom-audio-player');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnRewind = document.getElementById('btn-rewind');
const btnForward = document.getElementById('btn-forward');
const btnCloseAudio = document.getElementById('close-audio');
const progressWrapper = document.getElementById('progress-wrapper');
const progressFill = document.getElementById('progress-fill');
const timeCurrent = document.getElementById('time-current');
const timeTotal = document.getElementById('time-total');
const audioTitle = document.getElementById('audio-title');

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function initQuran() {
    fetch(`${QURAN_API}/surat`)
        .then(res => res.json())
        .then(json => renderSurahList(json.data))
        .catch(() => document.getElementById('surah-list').innerHTML = '<p>Error.</p>');

    document.getElementById('back-to-surah-list').addEventListener('click', () => {
        document.getElementById('surah-detail').classList.add('hidden');
        document.getElementById('surah-list').classList.remove('hidden');
        document.querySelector('.prayer-widget').classList.remove('hidden');
    });

    // --- Audio Player Logic ---
    document.getElementById('btn-play-full').addEventListener('click', () => {
        if (currentAudioUrl) {
            playerContainer.classList.remove('hidden');
            audioTitle.innerText = currentSurahName;
            if (audioEl.src !== currentAudioUrl) {
                audioEl.src = currentAudioUrl;
            }
            audioEl.play();
        }
    });

    btnCloseAudio.addEventListener('click', () => {
        audioEl.pause();
        playerContainer.classList.add('hidden');
    });

    btnPlayPause.addEventListener('click', () => {
        if (audioEl.paused) audioEl.play();
        else audioEl.pause();
    });

    btnRewind.addEventListener('click', () => { audioEl.currentTime = Math.max(0, audioEl.currentTime - 10); });
    btnForward.addEventListener('click', () => { audioEl.currentTime = Math.min(audioEl.duration, audioEl.currentTime + 10); });

    audioEl.addEventListener('play', () => { btnPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>'; });
    audioEl.addEventListener('pause', () => { btnPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>'; });
    
    audioEl.addEventListener('loadedmetadata', () => {
        timeTotal.innerText = formatTime(audioEl.duration);
    });

    audioEl.addEventListener('timeupdate', () => {
        timeCurrent.innerText = formatTime(audioEl.currentTime);
        const percent = (audioEl.currentTime / audioEl.duration) * 100;
        progressFill.style.width = `${percent}%`;
    });

    progressWrapper.addEventListener('click', (e) => {
        const rect = progressWrapper.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        const percent = clickX / width;
        audioEl.currentTime = percent * audioEl.duration;
    });

    // --- Mushaf Mode Logic ---
    document.getElementById('btn-mushaf-mode').addEventListener('click', () => toggleMushafMode(true));
    document.getElementById('btn-mushaf-exit').addEventListener('click', () => toggleMushafMode(false));
    document.getElementById('btn-mushaf-plus').addEventListener('click', () => { currentBaseFontSize += 0.5; applyFontSize(); });
    document.getElementById('btn-mushaf-minus').addEventListener('click', () => { if(currentBaseFontSize > 1.5) currentBaseFontSize -= 0.5; applyFontSize(); });
    document.getElementById('btn-mushaf-theme').addEventListener('click', () => document.getElementById('theme-toggle').click());
}

function applyFontSize() {
    document.querySelectorAll('.ayat-arabic').forEach(el => el.style.fontSize = `${currentBaseFontSize}rem`);
}

function toggleMushafMode(active) {
    const body = document.body;
    const controls = document.getElementById('mushaf-controls');
    if (active) {
        body.classList.add('mushaf-active');
        controls.classList.remove('hidden');
        try { document.documentElement.requestFullscreen(); } catch (e) {}
    } else {
        body.classList.remove('mushaf-active');
        controls.classList.add('hidden');
        try { if(document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
    }
}

function renderSurahList(surahs) {
    const container = document.getElementById('surah-list');
    container.innerHTML = '';
    
    surahs.forEach(surah => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-number">${surah.nomor}</div>
                <div class="card-title-arabic">${surah.nama}</div>
            </div>
            <div>
                <div class="card-title">${surah.namaLatin}</div>
                <div class="card-subtitle">${surah.arti} • ${surah.jumlahAyat} AYAT</div>
            </div>
        `;
        card.addEventListener('click', () => loadSurahDetail(surah.nomor));
        container.appendChild(card);
    });
}

async function loadSurahDetail(nomorSurah) {
    document.getElementById('surah-list').classList.add('hidden');
    document.querySelector('.prayer-widget').classList.add('hidden');
    document.getElementById('surah-detail').classList.remove('hidden');
    
    const ayatContainer = document.getElementById('ayat-list');
    ayatContainer.innerHTML = '';
    
    try {
        toggleLoading(true);
        const res = await fetch(`${QURAN_API}/surat/${nomorSurah}`);
        const json = await res.json();
        const surah = json.data;
        
        currentSurahName = surah.namaLatin;
        currentAudioUrl = surah.audioFull["05"]; 
        
        document.getElementById('detail-surah-name').innerText = surah.namaLatin.toUpperCase();
        document.getElementById('detail-surah-arti').innerText = surah.arti;
        document.getElementById('detail-surah-info').innerText = `${surah.tempatTurun} • ${surah.jumlahAyat} AYAT`;
        
        const bismillahHeader = document.getElementById('bismillah-header');
        if (nomorSurah === 1 || nomorSurah === 9) bismillahHeader.classList.add('hidden');
        else bismillahHeader.classList.remove('hidden');

        surah.ayat.forEach(ayat => {
            const div = document.createElement('div');
            div.className = 'ayat-item';
            div.innerHTML = `
                <div class="ayat-header">
                    <span class="ayat-number">${surah.nomor}:${ayat.nomorAyat}</span>
                </div>
                <div class="ayat-arabic" style="font-size: ${currentBaseFontSize}rem">${ayat.teksArab}</div>
                <div class="ayat-translation">${ayat.teksIndonesia}</div>
            `;
            ayatContainer.appendChild(div);
        });

    } catch (error) {
        ayatContainer.innerHTML = '<p>Gagal memuat ayat.</p>';
    } finally {
        toggleLoading(false);
    }
}

// --- HADIST, DOA, IBADAH, KITAB (Minimal changes to adapt to styling) ---
function initHadist() { /* Keeps same data and logic, styling is handled in CSS */ 
    const HADIST_API = 'https://hadis-api-id.vercel.app/hadith';
    const books = [{id:'bukhari',name:'HR. Bukhari',avail:7008},{id:'muslim',name:'HR. Muslim',avail:5362},{id:'abudaud',name:'HR. Abu Daud',avail:4590},{id:'tirmidzi',name:'HR. Tirmidzi',avail:3625}];
    const container = document.getElementById('hadist-books');
    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="card-title">${b.name}</div><div class="card-subtitle">${b.avail} HADIST</div>`;
        card.addEventListener('click', async () => {
            document.getElementById('hadist-books').classList.add('hidden');
            document.getElementById('hadist-detail').classList.remove('hidden');
            document.getElementById('hadist-book-name').innerText = b.name.toUpperCase();
            toggleLoading(true);
            try {
                const res = await fetch(`${HADIST_API}/${b.id}?limit=20`);
                const json = await res.json();
                const list = document.getElementById('hadist-list');
                list.innerHTML = '';
                json.items.forEach(h => {
                    list.innerHTML += `<div class="ayat-item"><div class="ayat-header"><span class="ayat-number">No. ${h.number}</span></div><div class="ayat-arabic" style="font-size:2.5rem">${h.arab}</div><div class="ayat-translation">${h.id}</div></div>`;
                });
            } catch(e) {}
            toggleLoading(false);
        });
        container.appendChild(card);
    });
    document.getElementById('back-to-hadist-list').addEventListener('click', () => {
        document.getElementById('hadist-detail').classList.add('hidden'); document.getElementById('hadist-books').classList.remove('hidden');
    });
}

const doaData = [
    { title: 'DOA SEBELUM MAKAN', arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', text: 'Allahumma baarik lanaa fiimaa rozaqtanaa wa qinaa \'adzaaban naar.', trans: 'Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka.' },
    { title: 'DOA SESUDAH MAKAN', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', text: 'Alhamdulillahilladzi ath\'amanaa wa saqoonaa wa ja\'alanaa muslimiin.', trans: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami termasuk golongan orang muslim.' },
    { title: 'DOA SEBELUM TIDUR', arabic: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ', text: 'Bismikallahumma ahyaa wa bismika amuut.', trans: 'Dengan nama-Mu ya Allah aku hidup, dan dengan nama-Mu aku mati.' }
];

function initDoa() {
    const container = document.getElementById('doa-list');
    function render(data) {
        container.innerHTML = '';
        data.forEach(d => {
            container.innerHTML += `<div class="card"><div class="card-title text-gold mb-3">${d.title}</div><div class="ayat-arabic" style="font-size:2.2rem; margin-bottom:12px;">${d.arabic}</div><div class="text-bold italic mb-3">${d.text}</div><div class="text-muted">${d.trans}</div></div>`;
        });
    }
    render(doaData);
    document.getElementById('search-doa').addEventListener('input', (e) => {
        render(doaData.filter(d => d.title.toLowerCase().includes(e.target.value.toLowerCase())));
    });
}

function initIbadahTracker() {
    const tasks = { wajib: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'], sunnah: ['Tahajud', 'Dhuha', 'Rawatib'], amalan: ['Baca Al-Quran', 'Zikir Pagi', 'Zikir Petang', 'Sedekah'] };
    let cDate = new Date();
    
    function render() {
        const key = 'myquran_tracker_' + cDate.toISOString().split('T')[0];
        const state = JSON.parse(localStorage.getItem(key) || '{}');
        ['wajib', 'sunnah', 'amalan'].forEach(cat => {
            const container = document.getElementById(`tracker-${cat}`);
            container.innerHTML = '';
            tasks[cat].forEach(t => {
                const tid = `task-${cat}-${t.replace(/\s+/g, '-').toLowerCase()}`;
                const div = document.createElement('div');
                div.className = 'check-item';
                div.innerHTML = `<input type="checkbox" id="${tid}" ${state[tid] ? 'checked' : ''}><label for="${tid}">${t}</label>`;
                container.appendChild(div);
                div.querySelector('input').addEventListener('change', e => {
                    const st = JSON.parse(localStorage.getItem(key) || '{}');
                    st[tid] = e.target.checked;
                    localStorage.setItem(key, JSON.stringify(st));
                });
            });
        });
        
        const dStr = cDate.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('current-date-display').innerText = cDate.toDateString() === new Date().toDateString() ? `HARI INI (${dStr})` : dStr.toUpperCase();
    }
    render();
    document.getElementById('prev-day').addEventListener('click', () => { cDate.setDate(cDate.getDate() - 1); render(); });
    document.getElementById('next-day').addEventListener('click', () => { if(cDate.toDateString() !== new Date().toDateString()){ cDate.setDate(cDate.getDate() + 1); render(); } });
}

function initMuslimah() {
    const data = [{title:'PENGERTIAN HAIDH', content:'Haidh adalah darah kebiasaan yang keluar dari rahim wanita sehat...'},{title:'MASA HAIDH', content:'Minimal 1 hari 1 malam, maksimal 15 hari.'}];
    const container = document.getElementById('muslimah-accordion');
    data.forEach(d => {
        const div = document.createElement('div');
        div.className = 'accordion-item';
        div.innerHTML = `<button class="accordion-header">${d.title} <i class="fa-solid fa-chevron-down"></i></button><div class="accordion-content"><p class="mt-4">${d.content}</p></div>`;
        div.querySelector('.accordion-header').addEventListener('click', (e) => {
            const content = div.querySelector('.accordion-content');
            content.classList.toggle('open');
            e.currentTarget.querySelector('i').className = content.classList.contains('open') ? 'fa-solid fa-chevron-up text-gold' : 'fa-solid fa-chevron-down';
        });
        container.appendChild(div);
    });
}

function initKitab() {
    const data = [{title:'RIYADHUS SHALIHIN', author:'Imam An-Nawawi', desc:'Kitab kumpulan hadist shahih populer.'},{title:'AL-HIKAM', author:'Ibn Athaillah', desc:'Kitab tasawuf dan hikmah.'}];
    const container = document.getElementById('kitab-list');
    data.forEach(d => {
        container.innerHTML += `<div class="card"><div class="card-title">${d.title}</div><div class="neo-badge inline-block mt-2 mb-3">Oleh: ${d.author}</div><div class="text-muted font-bold">${d.desc}</div></div>`;
    });
}
