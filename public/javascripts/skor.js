function searchAndScroll() {
    let searchValue = document.getElementById('searchInput').value.toLowerCase();
    let rows = document.querySelectorAll('#studentTable tr');
    let found = false;
    let eco = document.getElementById('error-search-nfound');
  
    rows.forEach(row => {
      row.classList.remove('bg-blue-200'); // Hapus highlight sebelumnya
      let rowName = row.dataset.name || ""; // Pastikan tidak undefined
  
      if (rowName.includes(searchValue)) {
        if (!found) {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
          found = true;
        }
        row.classList.add('highlight');
        // Hapus highlight setelah 3 detik
        setTimeout(() => {
          row.classList.remove('highlight');


        }, 3000);
      }
    });
  
    // Jika tidak ditemukan, tampilkan alert
    if (!found) {
      eco.classList.remove('hidden');
      setTimeout(() => {
        eco.classList.add('hidden');
      }, 4000);
    }
  }
