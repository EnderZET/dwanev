// grab everything we need

let drd = document.getElementById('dropdownT')
let dropdownStatus = false;
function toggleDropdown(){
  if (drd.classList.contains('relative')){
      drd.classList.remove('relative')
      drd.classList.add('hidden')

  }else{
    
    drd.classList.remove('hidden')
    if (window.location.pathname == '/'){
      document.getElementById('dr1').innerHTML = 'Dashboard'
      document.getElementById('bdr1').setAttribute('onclick', 'window.location.replace("/dashboard")')
    }else if (window.location.pathname == '/dashboard'){
      document.getElementById('dr1').innerHTML = 'Home'
      document.getElementById('bdr1').setAttribute('onclick', 'window.location.replace("/")')

    }else if (window.location.pathname == '/lapor'){
      document.getElementById('drd3').innerHTML = 'Home'
      document.getElementById('bdr3').setAttribute('onclick', 'window.location.replace("/")')
    }else if (window.location.pathname == '/skor'){
      document.getElementById('drd2').innerHTML = 'Home'
      document.getElementById('bdr2').setAttribute('onclick', 'window.location.replace("/")')
    }else if (window.location.pathname == '/about'){
      document.getElementById('drd4').innerHTML = 'Home'
      document.getElementById('bdr4').setAttribute('onclick', 'window.location.replace("/")')
    }
    drd.classList.add('relative')
  }
}

function toggleDropdown2(){
  if (drd.classList.contains('relative')){
      drd.classList.remove('relative')
      drd.classList.add('hidden')

  }else{
    
    drd.classList.remove('hidden')
    if (window.location.pathname == '/skor'){
      document.getElementById('drd2').innerHTML = 'Home'
      document.getElementById('bdr2').setAttribute('onclick', 'window.location.replace("/")')
    }else if (window.location.pathname == '/about'){
      document.getElementById('drd4').innerHTML = 'Home'
      document.getElementById('bdr4').setAttribute('onclick', 'window.location.replace("/")')
    }
    drd.classList.add('relative')
  }
}