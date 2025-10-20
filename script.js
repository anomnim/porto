document.addEventListener('DOMContentLoaded', () => {
    const longUrlInput = document.getElementById('longUrl');
    const shortenBtn = document.getElementById('shortenBtn');
    const resultBox = document.getElementById('resultBox');
    const shortUrlOutput = document.getElementById('shortUrlOutput');
    const copyBtn = document.getElementById('copyBtn');
    const statsList = document.getElementById('statsList');
    
    // URL Pangkalan untuk URL Pendek (misalnya, alamat GitHub Pages Anda)
    // Ganti dengan URL actual setelah di-deploy (contoh: https://username.github.io/nama-repo/)
    const BASE_URL = window.location.href.split('?')[0]; 

    // --- LOGIKA UTAMA ---

    // Fungsi untuk mendapatkan URL pangkalan (tanpa index.html, jika ada)
    function getBaseUrl() {
        let url = BASE_URL;
        if (url.endsWith('/')) {
            url = url.substring(0, url.length - 1);
        }
        if (url.endsWith('index.html')) {
            url = url.substring(0, url.lastIndexOf('/'));
        }
        return url;
    }

    // Fungsi untuk menghasilkan kode pendek acak
    function generateShortCode(length = 6) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    // Fungsi untuk mengambil data dari localStorage
    function getUrlData() {
        const data = localStorage.getItem('urlShortenerData');
        return data ? JSON.parse(data) : {};
    }

    // Fungsi untuk menyimpan data ke localStorage
    function saveUrlData(data) {
        localStorage.setItem('urlShortenerData', JSON.stringify(data));
    }

    // Event saat tombol 'Pendekkan' diklik
    shortenBtn.addEventListener('click', () => {
        const longUrl = longUrlInput.value.trim();

        if (!longUrl) {
            alert('Mohon masukkan URL yang valid.');
            return;
        }

        // Validasi URL sederhana
        try {
            new URL(longUrl);
        } catch (e) {
            alert('URL tidak valid. Pastikan formatnya benar (e.g., https://example.com).');
            return;
        }

        let urlData = getUrlData();
        let shortCode = generateShortCode();

        // Pastikan kode pendek unik (meskipun kemungkinannya kecil)
        while (urlData[shortCode]) {
            shortCode = generateShortCode();
        }

        // Simpan pemetaan dan statistik
        urlData[shortCode] = { 
            longUrl: longUrl, 
            visits: 0, 
            timestamp: new Date().toISOString() 
        };
        saveUrlData(urlData);

        const shortUrl = `${getBaseUrl()}?code=${shortCode}`;
        
        // Tampilkan hasil
        shortUrlOutput.value = shortUrl;
        resultBox.style.display = 'flex';
        
        // Perbarui statistik
        renderStats();

        alert(`URL berhasil dipendekkan! Kode: ${shortCode}`);
    });

    // Event untuk menyalin URL pendek
    copyBtn.addEventListener('click', () => {
        shortUrlOutput.select();
        document.execCommand('copy');
        copyBtn.textContent = 'Tersalin!';
        setTimeout(() => {
            copyBtn.textContent = 'Salin';
        }, 1500);
    });

    // --- FITUR STATISTIK ---

    // Fungsi untuk menampilkan daftar statistik
    function renderStats() {
        const urlData = getUrlData();
        const shortCodes = Object.keys(urlData);
        
        statsList.innerHTML = ''; 

        if (shortCodes.length === 0) {
            statsList.innerHTML = '<p id="noStats">Belum ada URL yang dipendekkan.</p>';
            return;
        }

        shortCodes.sort((a, b) => urlData[b].visits - urlData[a].visits); // Urutkan berdasarkan kunjungan

        shortCodes.forEach(code => {
            const data = urlData[code];
            const shortUrl = `${getBaseUrl()}?code=${code}`;

            const statItem = document.createElement('div');
            statItem.classList.add('stat-item');
            statItem.innerHTML = `
                <div class="stat-url">
                    Pendek: <a href="${shortUrl}" target="_blank">${shortUrl}</a>
                    <br>
                    Panjang: <span>${data.longUrl.length > 50 ? data.longUrl.substring(0, 50) + '...' : data.longUrl}</span>
                </div>
                <div class="stat-count">${data.visits} Kunjungan</div>
            `;
            statsList.appendChild(statItem);
        });
    }


    // --- LOGIKA PENGARAHAN ULANG (REDIRECT) & PELACAKAN KUNJUNGAN ---

    function handleRedirect() {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
            const urlData = getUrlData();
            const data = urlData[code];

            if (data && data.longUrl) {
                // 1. Tambahkan hitungan kunjungan
                data.visits = (data.visits || 0) + 1;
                saveUrlData(urlData);

                // 2. Arahkan ulang
                window.location.replace(data.longUrl); 
            } else {
                // Kode tidak ditemukan
                alert(`Kode pendek "${code}" tidak ditemukan.`);
                // Hapus kode dari URL dan kembali ke halaman utama
                window.history.replaceState({}, document.title, getBaseUrl());
            }
        } else {
            // Jika tidak ada kode, tampilkan halaman utama dengan statistik
            renderStats();
        }
    }

    // Jalankan logika redirect saat halaman dimuat
    handleRedirect();
});
