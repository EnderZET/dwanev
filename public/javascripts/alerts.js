function showAlert(message, type = "info") {
    // Hapus alert lama jika ada
    let existingAlert = document.getElementById("customAlert");
    if (existingAlert) {
        existingAlert.remove();
    }

    // Warna berdasarkan tipe
    const bgColors = {
        success: "bg-green-500",
        error: "bg-red-500",
        warning: "bg-yellow-400 text-black",
        info: "bg-blue-500"
    };

    // Buat elemen alert
    let alertBox = document.createElement("div");
    alertBox.id = "customAlert";
    alertBox.innerText = message;
    alertBox.className = `
        fixed top-5 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg 
        text-white font-semibold text-sm z-[9999] transition-all duration-500 opacity-0 scale-90
        ${bgColors[type] || "bg-blue-500"} 
    `;

    // Tambahkan ke body
    document.body.appendChild(alertBox);

    // Efek fade-in (opacity dari 0 → 1, scale dari 90% → 100%)
    setTimeout(() => {
        alertBox.classList.remove("opacity-0", "scale-90");
        alertBox.classList.add("opacity-100", "scale-100");
    }, 50);

    // Setelah 3 detik, fade-out dan hapus elemen
    setTimeout(() => {
        alertBox.classList.remove("opacity-100", "scale-100");
        alertBox.classList.add("opacity-0", "scale-90");
        setTimeout(() => {
            alertBox.remove();
        }, 500); // Hapus setelah animasi selesai
    }, 3000);
}

function confirmDelete(event, form) {
    event.preventDefault(); // Mencegah form langsung terkirim

    // Cek apakah sudah ada overlay sebelumnya, jika ada hapus dulu
    let existingOverlay = document.getElementById("confirmOverlay");
    if (existingOverlay) existingOverlay.remove();

    // Buat overlay
    let overlay = document.createElement("div");
    overlay.id = "confirmOverlay"; // Tambahkan ID agar bisa dihapus jika perlu
    overlay.className = "fixed inset-0 bg-black/50 flex justify-center items-center z-50";
    overlay.innerHTML = `
        <div class="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full text-center">
            <h2 class="text-lg font-bold mb-3">Konfirmasi Tindakan</h2>
            <p class="text-sm text-gray-600 mb-4">Apakah Anda yakin ingin melakukan tindakan ini?</p>
            <div class="flex justify-between">
                <button id="cancelBtn" class="px-4 py-2 bg-gray-300 rounded">Batal</button>
                <button id="confirmBtn" class="px-4 py-2 bg-red-500 text-white rounded">Lakukan</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    // Tambahkan event listener untuk tombol "Batal"
    document.getElementById("cancelBtn").addEventListener("click", function () {
        overlay.remove(); // Hapus modal jika user batal
    });

    // Tambahkan event listener untuk tombol "Hapus"
    document.getElementById("confirmBtn").addEventListener("click", function () {
        form.submit(); // Kirim form jika user konfirmasi
    });
}

// Buka popup saat form disubmit
function openVerifyModal(event) {
    event.preventDefault(); // Mencegah form submit langsung
    document.getElementById("verifyModal").classList.remove("hidden");
}

// Tutup popup
function closeVerifyModal() {
    document.getElementById("verifyModal").classList.add("hidden");
    document.getElementById("verifyInput").value = "";
}

// Submit form setelah input benar
var confirmVerifyBtn2 = document.getElementById("confirmVerify");
if (confirmVerifyBtn2){
    confirmVerifyBtn2.addEventListener("click", function() {
        const inputText = document.getElementById("verifyInput").value.trim();
    
        if (inputText === "AKU BERSUMPAH DEMI DP") {
            document.getElementById("verifyForm").submit(); // Kirim form
        } else {
            alert("Kalimat salah! Ulangi dengan benar.");
        }
    });
    
}

function showPopup() {
    const popup = document.getElementById("popup");
    
    popup.classList.remove("hidden","opacity-0", "pointer-events-none");
    popup.firstElementChild.classList.add("scale-100");
}

function closePopup() {
    const popup = document.getElementById("popup");
    popup.classList.add("opacity-0", "pointer-events-none");
    popup.firstElementChild.classList.remove("scale-100");
    setTimeout(() => {
        popup.classList.add("hidden");
    }, 300);
}

function copyCode() {
    const code = document.getElementById("code-block").innerText;
    navigator.clipboard.writeText(code);
    alert("Code copied to clipboard!");
}