$(document).ready(function() {
  $('#absen-masuk-btn').click(function() {
    var nik = $('#nik').val();
    var nama = $('#nama').val();
    var lokasi = $('#lokasi').val();
    var foto = $('#foto').val();
    
    // Kirim data ke Google Apps Script
    $.ajax({
      type: 'POST',
      url: 'https:                                                  
      data: {
        '//script.google.com/macros/d/AKfycbw4XuMOa5c-xdJAw1CG6B00AuiycgtNp9jKaqaNwZ0u3DuQvzMFrqorpchtkjugVpC1/exec', 
      data: {
        'nik': nik,
        'nama': nama,
        'lokasi': lokasi,
        'foto': foto,
        'aksi': 'absen_masuk'
      },
      success: function(data) {
        console.log(data);
        $('#absensi-rekaman').html(data);
      }
    });
  });
  
  $('#absen-pulang-btn').click(function() {
    var nik = $('#nik').val();
    var nama = $('#nama').val();
    var lokasi = $('#lokasi').val();
    var foto = $('#foto').val();
    
                                       
    $.ajax({
      type: '// Kirim data ke Google Apps Script
    $.ajax({
      type: 'POST',
      url: 'https://script.google.com/macros/d/AKfycbw4XuMOa5c-xdJAw1CG6B00AuiycgtNp9jKaqaNwZ0u3DuQvzMFrqorpchtkjugVpC1/exec',
      data: {
        'nik': nik,
        'nama': nama,
        'lokasi': lokasi,
        'foto': foto,
        'aksi': 'absen_pulang'
      },
      success: function(data) {
        console.log(data);
        $('#absensi-rekaman').html(data);
      }
    });
  });
});
