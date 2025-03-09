
function pen(){
    document.getElementById('submit-button').classList.replace('opacity-20', 'opacity-100')
    document.getElementById('submit-button').disabled = false;
    document.getElementById('submit-button').disabled = false;
    let cskor = document.getElementById('currentScores').innerText;
    let projected = document.getElementById('projected');

    projected.classList.remove('hidden');
    projected.innerHTML = `Skor akhir akan menjadi: ${cskor} - ${penalties[dropdown.value]} = ${cskor - penalties[dropdown.value]}`;

}

// Populate Dropdown with Penalty Options
const dropdown = document.getElementById('penalty-dropdown');
Object.keys(penalties).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.innerText = key+" | -"+penalties[key]+" poin";
    dropdown.appendChild(option);
});

// Show Popup
function showPopup() {
    document.getElementById('popup').classList.remove('hidden');
}

// Close Popup
document.getElementById('close-popup').addEventListener('click', () => {
    document.getElementById('popup').classList.add('hidden');
});

// PEN 2

function pen2(){
    document.getElementById('submit-button2').classList.replace('opacity-20', 'opacity-100')
    document.getElementById('submit-button2').disabled = false;
    document.getElementById('submit-button2').disabled = false;
    let cskor = document.getElementById('currentScores2').innerText;
    let projected = document.getElementById('projected2');

    projected.classList.remove('hidden');
    projected.innerHTML = `Skor akhir akan menjadi: ${cskor} + ${penalties[dropdown2.value]} = ${cskor + penalties[dropdown2.value]}`;

}

// Populate Dropdown with Penalty Options
const dropdown2 = document.getElementById('penalty-dropdown2');
Object.keys(penalties).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.innerText = key+" | +"+penalties[key]+" poin";
    dropdown2.appendChild(option);
});

function showPopup2() {
    document.getElementById('popup2').classList.remove('hidden');
}
// Close Popup
document.getElementById('close-popup2').addEventListener('click', () => {
    document.getElementById('popup2').classList.add('hidden');
});


