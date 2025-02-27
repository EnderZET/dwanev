document.addEventListener("DOMContentLoaded", function () {
    const table = document.getElementById("reportTable");
    const paginationContainer = document.getElementById("pagination");
    const rowsPerPage = 10;
    let currentPage = 1;
  
    function displayPage(page) {
      const rows = table.getElementsByTagName("tr");
      const start = (page - 1) * rowsPerPage;
      const end = start + rowsPerPage;
  
      for (let i = 0; i < rows.length; i++) {
        rows[i].style.display = i >= start && i < end ? "table-row" : "none";
      }
    }
  
    function setupPagination() {
      const rows = table.getElementsByTagName("tr").length;
      const pageCount = Math.ceil(rows / rowsPerPage);
  
      paginationContainer.innerHTML = "";
      for (let i = 1; i <= pageCount; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = `mx-1 px-3 py-1 border rounded ${i === currentPage ? "bg-blue-500 text-white" : "bg-gray-200"}`;
        btn.addEventListener("click", function () {
          currentPage = i;
          displayPage(currentPage);
          setupPagination();
        });
        paginationContainer.appendChild(btn);
      }
    }
  
    displayPage(currentPage);
    setupPagination();
  });
  