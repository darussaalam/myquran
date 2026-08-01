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

// Utility: Show/Hide Loading
function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (show) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
}

// --- THEME ---
function initTheme() {
    const btn = document.getElementById('theme-toggle');
    const body = document.body;
    
    // Check saved theme
    if (localStorage.getItem('myquran_theme') === 'light') {
        body.classList.remove('dark-mode');
        btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
    } else {
        body.classList.add('dark-mode'); // default
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
                    const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=20`); // Kemenag method usually 20 or default
                    const json = await res.json();
                    if (json.code === 200) {
                        displayPrayerTimes(json.data.timings);
                        const hijri = json.data.date.hijri;
                        hijriText.innerText = `${hijri.day} ${hijri.month.en} ${hijri.year} H`;
                    }
                } catch (error) {
                    container.innerHTML = '<p>Gagal memuat jadwal sholat.</p>';
                    hijriText.innerText = 'Kalender Hijriyah';
                }
            },
            (error) => {
                container.innerHTML = '<p>Akses lokasi ditolak. Jadwal sholat tidak tersedia.</p>';
                hijriText.innerText = 'Kalender Hijriyah';
            }
        );
    } else {
        container.innerHTML = '<p>Geolocation tidak didukung di peramban ini.</p>';
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

    // Find next prayer logic
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
            
            // Exit mushaf mode if active
            if (document.body.classList.contains('mushaf-active')) {
                toggleMushafMode(false);
            }
        });
    });
}

// --- QURAN FEATURE ---
const QURAN_API = 'https://equran.id/api/v2';
let currentAudioUrl = '';
let currentSurahName = '';
let currentBaseFontSize = 2.8; // rem

async function initQuran() {
    try {
        toggleLoading(true);
        const res = await fetch(`${QURAN_API}/surat`);
        const json = await res.json();
        renderSurahList(json.data);
    } catch (error) {
        document.getElementById('surah-list').innerHTML = '<p>Gagal memuat data.</p>';
    } finally {
        toggleLoading(false);
    }

    document.getElementById('back-to-surah-list').addEventListener('click', () => {
        document.getElementById('surah-detail').classList.add('hidden');
        document.getElementById('surah-list').classList.remove('hidden');
        document.getElementById('prayer-times-container').parentElement.classList.remove('hidden');
    });

    // Murottal Player logic
    const playerContainer = document.getElementById('audio-player-container');
    const audioEl = document.getElementById('global-audio');
    
    document.getElementById('btn-play-full').addEventListener('click', () => {
        if (currentAudioUrl) {
            playerContainer.classList.remove('hidden');
            audioEl.src = currentAudioUrl;
            document.getElementById('audio-title').innerText = currentSurahName;
            audioEl.play();
        }
    });

    document.getElementById('close-audio').addEventListener('click', () => {
        audioEl.pause();
        playerContainer.classList.add('hidden');
    });

    // Mushaf Mode Logic
    document.getElementById('btn-mushaf-mode').addEventListener('click', () => toggleMushafMode(true));
    document.getElementById('btn-mushaf-exit').addEventListener('click', () => toggleMushafMode(false));
    
    document.getElementById('btn-mushaf-plus').addEventListener('click', () => {
        currentBaseFontSize += 0.5;
        applyFontSize();
    });
    document.getElementById('btn-mushaf-minus').addEventListener('click', () => {
        if(currentBaseFontSize > 1.5) currentBaseFontSize -= 0.5;
        applyFontSize();
    });
    document.getElementById('btn-mushaf-theme').addEventListener('click', () => {
        document.getElementById('theme-toggle').click();
    });
}

function applyFontSize() {
    document.querySelectorAll('.ayat-arabic').forEach(el => {
        el.style.fontSize = `${currentBaseFontSize}rem`;
    });
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
                <div class="card-subtitle">${surah.arti} • ${surah.jumlahAyat} Ayat</div>
            </div>
        `;
        card.addEventListener('click', () => loadSurahDetail(surah.nomor));
        container.appendChild(card);
    });
}

async function loadSurahDetail(nomorSurah) {
    document.getElementById('surah-list').classList.add('hidden');
    document.getElementById('prayer-times-container').parentElement.classList.add('hidden');
    document.getElementById('surah-detail').classList.remove('hidden');
    
    const ayatContainer = document.getElementById('ayat-list');
    ayatContainer.innerHTML = '';
    
    try {
        toggleLoading(true);
        const res = await fetch(`${QURAN_API}/surat/${nomorSurah}`);
        const json = await res.json();
        const surah = json.data;
        
        currentSurahName = surah.namaLatin;
        currentAudioUrl = surah.audioFull["05"]; // 05 is Misyari Rasyid
        
        document.getElementById('detail-surah-name').innerText = surah.namaLatin;
        document.getElementById('detail-surah-arti').innerText = surah.arti;
        document.getElementById('detail-surah-info').innerText = `${surah.tempatTurun} • ${surah.jumlahAyat} Ayat`;
        
        const bismillahHeader = document.getElementById('bismillah-header');
        if (nomorSurah === 1 || nomorSurah === 9) {
            bismillahHeader.classList.add('hidden');
        } else {
            bismillahHeader.classList.remove('hidden');
        }

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

// --- HADIST FEATURE ---
const HADIST_API = 'https://hadis-api-id.vercel.app/hadith';
const hadistBooks = [
    { id: 'bukhari', name: 'HR. Bukhari', available: 7008 },
    { id: 'muslim', name: 'HR. Muslim', available: 5362 },
    { id: 'abudaud', name: 'HR. Abu Daud', available: 4590 },
    { id: 'tirmidzi', name: 'HR. Tirmidzi', available: 3625 }
];

function initHadist() {
    const container = document.getElementById('hadist-books');
    hadistBooks.forEach(book => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${book.name}</div>
            </div>
            <div class="card-subtitle">Tersedia ${book.available} Hadist</div>
        `;
        card.addEventListener('click', () => loadHadistDetail(book.id, book.name));
        container.appendChild(card);
    });

    document.getElementById('back-to-hadist-list').addEventListener('click', () => {
        document.getElementById('hadist-detail').classList.add('hidden');
        document.getElementById('hadist-books').classList.remove('hidden');
    });
}

async function loadHadistDetail(bookId, bookName) {
    document.getElementById('hadist-books').classList.add('hidden');
    document.getElementById('hadist-detail').classList.remove('hidden');
    document.getElementById('hadist-book-name').innerText = bookName;
    
    const container = document.getElementById('hadist-list');
    container.innerHTML = '';
    
    try {
        toggleLoading(true);
        const res = await fetch(`${HADIST_API}/${bookId}?limit=20`);
        const json = await res.json();
        
        json.items.forEach(h => {
            const div = document.createElement('div');
            div.className = 'ayat-item'; 
            div.innerHTML = `
                <div class="ayat-header">
                    <span class="ayat-number">Hadist No. ${h.number}</span>
                </div>
                <div class="ayat-arabic">${h.arab}</div>
                <div class="ayat-translation">${h.id}</div>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        container.innerHTML = '<p>Gagal memuat hadist.</p>';
    } finally {
        toggleLoading(false);
    }
}

// --- DOA HARIAN ---
const doaData = [
    { title: 'Doa Sebelum Makan', arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', text: 'Allahumma baarik lanaa fiimaa rozaqtanaa wa qinaa \'adzaaban naar.', trans: 'Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka.' },
    { title: 'Doa Sesudah Makan', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', text: 'Alhamdulillahilladzi ath\'amanaa wa saqoonaa wa ja\'alanaa muslimiin.', trans: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami termasuk golongan orang muslim.' },
    { title: 'Doa Sebelum Tidur', arabic: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ', text: 'Bismikallahumma ahyaa wa bismika amuut.', trans: 'Dengan nama-Mu ya Allah aku hidup, dan dengan nama-Mu aku mati.' },
    { title: 'Doa Bangun Tidur', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', text: 'Alhamdulillahilladzi ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur.', trans: 'Segala puji bagi Allah, yang telah membangunkan kami setelah menidurkan kami, dan kepada-Nya lah kami dibangkitkan.' }
];

function initDoa() {
    const container = document.getElementById('doa-list');
    const searchInput = document.getElementById('search-doa');
    
    function renderDoa(data) {
        container.innerHTML = '';
        data.forEach(doa => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <div class="card-title gold-text mb-4">${doa.title}</div>
                <div style="font-family: var(--font-arabic); font-size: 1.8rem; text-align: right; margin-bottom: 12px;">${doa.arabic}</div>
                <div style="font-size: 0.95rem; font-style: italic; margin-bottom: 8px;">${doa.text}</div>
                <div style="font-size: 0.95rem; color: var(--text-muted);">${doa.trans}</div>
            `;
            container.appendChild(card);
        });
    }

    renderDoa(doaData);
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = doaData.filter(d => d.title.toLowerCase().includes(query) || d.trans.toLowerCase().includes(query));
        renderDoa(filtered);
    });
}

// --- IBADAH TRACKER ---
const trackerTasks = {
    wajib: ['Subuh', 'Dzuhur', 'Ashar', 'Maghrib', 'Isya'],
    sunnah: ['Tahajud', 'Dhuha', 'Rawatib'],
    amalan: ['Baca Al-Quran', 'Zikir Pagi', 'Zikir Petang', 'Sedekah']
};
let currentDate = new Date();

function initIbadahTracker() {
    updateDateDisplay();
    renderTracker();

    document.getElementById('prev-day').addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateDisplay();
        renderTracker();
    });

    document.getElementById('next-day').addEventListener('click', () => {
        const today = new Date();
        if (currentDate.toDateString() !== today.toDateString()) {
            currentDate.setDate(currentDate.getDate() + 1);
            updateDateDisplay();
            renderTracker();
        }
    });
}

function updateDateDisplay() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateString = currentDate.toLocaleDateString('id-ID', options);
    const today = new Date();
    document.getElementById('current-date-display').innerText = currentDate.toDateString() === today.toDateString() ? `Hari Ini (${dateString})` : dateString;
}

function renderTracker() {
    const key = 'myquran_tracker_' + currentDate.toISOString().split('T')[0];
    const state = JSON.parse(localStorage.getItem(key) || '{}');
    
    ['wajib', 'sunnah', 'amalan'].forEach(cat => {
        const container = document.getElementById(`tracker-${cat}`);
        container.innerHTML = '';
        trackerTasks[cat].forEach(task => {
            const taskId = `task-${cat}-${task.replace(/\s+/g, '-').toLowerCase()}`;
            const isChecked = state[taskId] ? 'checked' : '';
            
            const div = document.createElement('div');
            div.className = 'check-item';
            div.innerHTML = `<input type="checkbox" id="${taskId}" ${isChecked}><label for="${taskId}">${task}</label>`;
            container.appendChild(div);
            
            div.querySelector('input').addEventListener('change', (e) => {
                const curState = JSON.parse(localStorage.getItem(key) || '{}');
                curState[taskId] = e.target.checked;
                localStorage.setItem(key, JSON.stringify(curState));
            });
        });
    });
}

// --- MUSLIMAH SECTION ---
const muslimahData = [
    { title: 'Pengertian Haidh', content: 'Haidh adalah darah kebiasaan yang keluar dari rahim wanita sehat. Diharamkan sholat, puasa, thawaf, dan menyentuh mushaf.' },
    { title: 'Masa Haidh dan Suci', content: 'Minimal 1 hari 1 malam (24 jam), maksimal 15 hari. Suci minimal 15 hari.' }
];

function initMuslimah() {
    const container = document.getElementById('muslimah-accordion');
    muslimahData.forEach(item => {
        const div = document.createElement('div');
        div.className = 'accordion-item';
        div.innerHTML = `
            <button class="accordion-header">${item.title} <i class="fa-solid fa-chevron-down"></i></button>
            <div class="accordion-content"><p style="padding-top: 16px;">${item.content}</p></div>
        `;
        const btn = div.querySelector('.accordion-header');
        const content = div.querySelector('.accordion-content');
        btn.addEventListener('click', () => {
            content.classList.toggle('open');
            btn.querySelector('i').className = content.classList.contains('open') ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down';
        });
        container.appendChild(div);
    });
}

// --- KITAB ULAMA SECTION ---
const kitabData = [
    { title: 'Riyadhus Shalihin', author: 'Imam An-Nawawi', desc: 'Kitab kumpulan hadist shahih populer.' },
    { title: 'Al-Hikam', author: 'Ibn Athaillah', desc: 'Kitab tasawuf dan hikmah.' }
];

function initKitab() {
    const container = document.getElementById('kitab-list');
    kitabData.forEach(kitab => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-title">${kitab.title}</div>
            <div class="card-subtitle gold-text mb-4">Oleh: ${kitab.author}</div>
            <div style="font-size: 0.9rem; color: var(--text-muted);">${kitab.desc}</div>
        `;
        container.appendChild(card);
    });
}
