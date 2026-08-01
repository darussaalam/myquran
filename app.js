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

// Loading Handler
function toggleLoading(show) {
    const loading = document.getElementById('loading');
    if (show) loading.classList.remove('hidden');
    else loading.classList.add('hidden');
}

// --- THEME SYSTEM ---
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

// --- GEOLOCATION & PRAYER TIMES ---
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
                    container.innerHTML = '<p class="text-muted">Gagal memuat jadwal sholat.</p>';
                }
            },
            (error) => {
                container.innerHTML = '<p class="text-muted">Akses lokasi tidak diizinkan.</p>';
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
        });
    });
}

// --- QURAN & SPOTLIGHT ZEN STAGE ENGINE ---
const QURAN_API = 'https://equran.id/api/v2';
let currentSurahData = null;
let currentAyatIndex = 0;

// Zen Elements
const audioEl = document.getElementById('global-audio');
const zenStageOverlay = document.getElementById('zen-stage-overlay');
const btnZenMode = document.getElementById('btn-zen-mode');
const btnZenClose = document.getElementById('btn-zen-close');
const btnZenPlayPause = document.getElementById('btn-zen-play-pause');
const btnZenPrev = document.getElementById('btn-zen-prev');
const btnZenNext = document.getElementById('btn-zen-next');

const zenSurahTitle = document.getElementById('zen-surah-title');
const zenVerseCounter = document.getElementById('zen-verse-counter');
const zenArabicActive = document.getElementById('zen-arabic-active');
const zenTranslationActive = document.getElementById('zen-translation-active');
const zenActiveCard = document.getElementById('zen-active-card');

const zenProgressBarContainer = document.getElementById('zen-progress-bar-container');
const zenProgressFill = document.getElementById('zen-progress-fill');
const zenTimeCurrent = document.getElementById('zen-time-current');
const zenTimeDuration = document.getElementById('zen-time-duration');

function formatSeconds(sec) {
    if (isNaN(sec) || !isFinite(sec)) return "00:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function initQuran() {
    fetch(`${QURAN_API}/surat`)
        .then(res => res.json())
        .then(json => renderSurahList(json.data))
        .catch(() => document.getElementById('surah-list').innerHTML = '<p>Error memuat Al-Quran.</p>');

    document.getElementById('back-to-surah-list').addEventListener('click', () => {
        document.getElementById('surah-detail').classList.add('hidden');
        document.getElementById('surah-list').classList.remove('hidden');
        document.querySelector('.prayer-widget').classList.remove('hidden');
    });

    // Zen Stage Launch
    btnZenMode.addEventListener('click', () => {
        if (currentSurahData && currentSurahData.ayat && currentSurahData.ayat.length > 0) {
            currentAyatIndex = 0;
            openZenStage();
        }
    });

    btnZenClose.addEventListener('click', closeZenStage);

    // Audio Playback Controls
    btnZenPlayPause.addEventListener('click', () => {
        if (audioEl.paused) {
            audioEl.play();
        } else {
            audioEl.pause();
        }
    });

    btnZenPrev.addEventListener('click', () => {
        if (currentAyatIndex > 0) {
            currentAyatIndex--;
            playZenVerse();
        }
    });

    btnZenNext.addEventListener('click', () => {
        if (currentSurahData && currentAyatIndex < currentSurahData.ayat.length - 1) {
            currentAyatIndex++;
            playZenVerse();
        }
    });

    // Audio Engine Events
    audioEl.addEventListener('play', () => {
        btnZenPlayPause.innerHTML = '<i class="fa-solid fa-pause"></i>';
    });

    audioEl.addEventListener('pause', () => {
        btnZenPlayPause.innerHTML = '<i class="fa-solid fa-play"></i>';
    });

    audioEl.addEventListener('timeupdate', () => {
        zenTimeCurrent.innerText = formatSeconds(audioEl.currentTime);
        zenTimeDuration.innerText = formatSeconds(audioEl.duration);
        if (audioEl.duration) {
            const percent = (audioEl.currentTime / audioEl.duration) * 100;
            zenProgressFill.style.width = `${percent}%`;
        }
    });

    audioEl.addEventListener('ended', () => {
        // Auto advance to next verse smoothly
        if (currentSurahData && currentAyatIndex < currentSurahData.ayat.length - 1) {
            currentAyatIndex++;
            playZenVerse();
        } else {
            closeZenStage();
        }
    });

    zenProgressBarContainer.addEventListener('click', (e) => {
        const rect = zenProgressBarContainer.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const width = rect.width;
        if (audioEl.duration) {
            audioEl.currentTime = (clickX / width) * audioEl.duration;
        }
    });
}

function openZenStage() {
    zenStageOverlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    try { document.documentElement.requestFullscreen(); } catch (e) {}
    playZenVerse();
}

function closeZenStage() {
    zenStageOverlay.classList.add('hidden');
    document.body.style.overflow = '';
    audioEl.pause();
    try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {}
}

function playZenVerse() {
    if (!currentSurahData) return;
    const verse = currentSurahData.ayat[currentAyatIndex];
    if (!verse) return;

    // Restart verse pop animation
    zenActiveCard.classList.remove('zen-active-card');
    void zenActiveCard.offsetWidth; // trigger reflow
    zenActiveCard.classList.add('zen-active-card');

    // Update Content
    zenSurahTitle.innerText = `Surah ${currentSurahData.namaLatin}`;
    zenVerseCounter.innerText = `Ayat ${verse.nomorAyat} dari ${currentSurahData.jumlahAyat}`;
    zenArabicActive.innerText = verse.teksArab;
    zenTranslationActive.innerText = verse.teksIndonesia;

    // Load Audio URL for Misyari Rasyid ("05")
    const audioUrl = verse.audio["05"] || verse.audio["01"];
    audioEl.src = audioUrl;
    audioEl.play().catch(err => console.log('Autoplay handled:', err));
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
        currentSurahData = json.data;
        
        document.getElementById('detail-surah-name').innerText = currentSurahData.namaLatin;
        document.getElementById('detail-surah-arti').innerText = currentSurahData.arti;
        document.getElementById('detail-surah-info').innerText = `${currentSurahData.tempatTurun} • ${currentSurahData.jumlahAyat} AYAT`;
        
        const bismillahHeader = document.getElementById('bismillah-header');
        if (nomorSurah === 1 || nomorSurah === 9) bismillahHeader.classList.add('hidden');
        else bismillahHeader.classList.remove('hidden');

        currentSurahData.ayat.forEach(ayat => {
            const div = document.createElement('div');
            div.className = 'ayat-item';
            div.id = `ayat-${ayat.nomorAyat}`;
            div.innerHTML = `
                <div class="ayat-header">
                    <span class="ayat-number">${currentSurahData.nomor}:${ayat.nomorAyat}</span>
                </div>
                <div class="ayat-arabic">${ayat.teksArab}</div>
                <div class="ayat-translation">${ayat.teksIndonesia}</div>
            `;
            ayatContainer.appendChild(div);
        });

    } catch (error) {
        ayatContainer.innerHTML = '<p class="text-muted">Gagal memuat ayat Al-Quran.</p>';
    } finally {
        toggleLoading(false);
    }
}

// --- HADIST, DOA, IBADAH, MUSLIMAH, KITAB ---
function initHadist() {
    const HADIST_API = 'https://hadis-api-id.vercel.app/hadith';
    const books = [
        { id: 'bukhari', name: 'HR. Bukhari', avail: 7008 },
        { id: 'muslim', name: 'HR. Muslim', avail: 5362 },
        { id: 'abudaud', name: 'HR. Abu Daud', avail: 4590 },
        { id: 'tirmidzi', name: 'HR. Tirmidzi', avail: 3625 }
    ];
    const container = document.getElementById('hadist-books');
    books.forEach(b => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `<div class="card-title">${b.name}</div><div class="card-subtitle mt-2">${b.avail} HADIST SHAHIH</div>`;
        card.addEventListener('click', async () => {
            document.getElementById('hadist-books').classList.add('hidden');
            document.getElementById('hadist-detail').classList.remove('hidden');
            document.getElementById('hadist-book-name').innerText = b.name;
            toggleLoading(true);
            try {
                const res = await fetch(`${HADIST_API}/${b.id}?limit=20`);
                const json = await res.json();
                const list = document.getElementById('hadist-list');
                list.innerHTML = '';
                json.items.forEach(h => {
                    list.innerHTML += `
                        <div class="ayat-item">
                            <div class="ayat-header"><span class="luxury-badge">Hadist No. ${h.number}</span></div>
                            <div class="ayat-arabic" style="font-size:2.3rem">${h.arab}</div>
                            <div class="ayat-translation">${h.id}</div>
                        </div>
                    `;
                });
            } catch(e) {}
            toggleLoading(false);
        });
        container.appendChild(card);
    });

    document.getElementById('back-to-hadist-list').addEventListener('click', () => {
        document.getElementById('hadist-detail').classList.add('hidden');
        document.getElementById('hadist-books').classList.remove('hidden');
    });
}

const doaData = [
    { title: 'DOA SEBELUM MAKAN', arabic: 'اللَّهُمَّ بَارِكْ لَنَا فِيمَا رَزَقْتَنَا وَقِنَا عَذَابَ النَّارِ', text: 'Allahumma baarik lanaa fiimaa rozaqtanaa wa qinaa \'adzaaban naar.', trans: 'Ya Allah, berkahilah kami dalam rezeki yang telah Engkau berikan kepada kami dan peliharalah kami dari siksa api neraka.' },
    { title: 'DOA SESUDAH MAKAN', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنَا وَسَقَانَا وَجَعَلَنَا مُسْلِمِينَ', text: 'Alhamdulillahilladzi ath\'amanaa wa saqoonaa wa ja\'alanaa muslimiin.', trans: 'Segala puji bagi Allah yang telah memberi kami makan dan minum serta menjadikan kami termasuk golongan orang muslim.' },
    { title: 'DOA SEBELUM TIDUR', arabic: 'بِاسْمِكَ اللَّهُمَّ أَحْيَا وَبِاسْمِكَ أَمُوتُ', text: 'Bismikallahumma ahyaa wa bismika amuut.', trans: 'Dengan nama-Mu ya Allah aku hidup, dan dengan nama-Mu aku mati.' },
    { title: 'DOA BANGUN TIDUR', arabic: 'الْحَمْدُ لِلَّهِ الَّذِي أَحْيَانَا بَعْدَ مَا أَمَاتَنَا وَإِلَيْهِ النُّشُورُ', text: 'Alhamdulillahilladzi ahyaanaa ba\'da maa amaatanaa wa ilaihin nusyuur.', trans: 'Segala puji bagi Allah, yang telah membangunkan kami setelah menidurkan kami, dan kepada-Nya lah kami dibangkitkan.' }
];

function initDoa() {
    const container = document.getElementById('doa-list');
    function render(data) {
        container.innerHTML = '';
        data.forEach(d => {
            container.innerHTML += `
                <div class="glass-card">
                    <div class="card-title text-gold mb-2" style="font-size:1.15rem">${d.title}</div>
                    <div class="ayat-arabic" style="font-size:2rem; margin-bottom:14px;">${d.arabic}</div>
                    <div class="font-bold mb-2 text-secondary" style="font-style:italic">${d.text}</div>
                    <div class="text-muted" style="font-size:0.95rem">${d.trans}</div>
                </div>
            `;
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
    const data = [
        { title: 'PENGERTIAN HAIDH (MENSTRUASI)', content: 'Haidh adalah darah kebiasaan yang keluar dari rahim wanita sehat pada waktu-waktu tertentu. Selama masa haidh, wanita diharamkan untuk sholat, puasa, thawaf, dan menyentuh mushaf Al-Quran.' },
        { title: 'MASA HAIDH DAN SUCI', content: 'Minimal masa haidh adalah sehari semalam (24 jam), dan maksimal 15 hari 15 malam. Masa suci antara dua haidh minimal adalah 15 hari.' },
        { title: 'NIFAS (DARAH PASCA MELAHIRKAN)', content: 'Nifas adalah darah yang keluar setelah proses melahirkan. Masa maksimal nifas umumnya adalah 40 hari (atau 60 hari menurut madzhab Syafi\'i).' },
        { title: 'ISTIHADAH (DARAH PENYAKIT)', content: 'Istihadah adalah darah yang keluar di luar masa haidh dan nifas. Wanita istihadah tetap wajib sholat dan puasa setelah membersihkan diri dan berwudhu setiap kali masuk waktu sholat.' }
    ];
    const container = document.getElementById('muslimah-accordion');
    data.forEach(d => {
        const div = document.createElement('div');
        div.className = 'accordion-item';
        div.innerHTML = `
            <button class="accordion-header">${d.title} <i class="fa-solid fa-chevron-down"></i></button>
            <div class="accordion-content"><p class="mt-4 mb-4">${d.content}</p></div>
        `;
        div.querySelector('.accordion-header').addEventListener('click', (e) => {
            const content = div.querySelector('.accordion-content');
            content.classList.toggle('open');
            e.currentTarget.querySelector('i').className = content.classList.contains('open') ? 'fa-solid fa-chevron-up text-gold' : 'fa-solid fa-chevron-down';
        });
        container.appendChild(div);
    });
}

function initKitab() {
    const data = [
        { title: 'RIYADHUS SHALIHIN', author: 'Imam An-Nawawi', desc: 'Kitab kumpulan hadist shahih paling populer mengenai adab dan akhlak sehari-hari.' },
        { title: 'AL-HIKAM', author: 'Ibn Athaillah As-Sakandari', desc: 'Kitab hikmah dan tasawuf yang sangat mendalam untuk pembersihan jiwa.' },
        { title: 'BULUGHUL MARAM', author: 'Ibnu Hajar Al-Asqalani', desc: 'Kitab perujukan hadist hukum fiqh utama bagi penuntut ilmu.' },
        { title: 'TAFSIR IBNU KATSIR', author: 'Ibnu Katsir', desc: 'Rujukan utama penafsiran Al-Quran ayat demi ayat secara shahih.' }
    ];
    const container = document.getElementById('kitab-list');
    data.forEach(d => {
        container.innerHTML += `
            <div class="card">
                <div class="card-title">${d.title}</div>
                <div class="luxury-badge inline-block mt-2 mb-2">Oleh: ${d.author}</div>
                <div class="card-subtitle">${d.desc}</div>
            </div>
        `;
    });
}
