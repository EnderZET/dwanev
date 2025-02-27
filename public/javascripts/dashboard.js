document.getElementById("sortReports").addEventListener("change", function() {
    const selectedSort = this.value;
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("sort", selectedSort);
    window.location.search = urlParams.toString();
});

document.addEventListener("DOMContentLoaded", function () {
    const sortSelect = document.getElementById("sortReports"); // Ambil elemen dropdown

    // Cek apakah ada pilihan sortir yang tersimpan di localStorage
    const savedSort = localStorage.getItem("selectedSort");
    if (savedSort) {
        sortSelect.value = savedSort; // Atur dropdown sesuai pilihan terakhir
    }

    // Simpan pilihan saat user mengubah sorting
    sortSelect.addEventListener("change", function () {
        localStorage.setItem("selectedSort", sortSelect.value);
        window.location.href = `/dashboard?sort=${sortSelect.value}`; // Reload halaman dengan query sort
    });
  

});
