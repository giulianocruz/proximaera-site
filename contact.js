document.getElementById('contactForm')?.addEventListener('submit',function(e){e.preventDefault();const f=new FormData(this);const subject='[Próxima Era] '+f.get('subject');const body=`Nome: ${f.get('name')}
E-mail: ${f.get('email')}

${f.get('message')}`;location.href='mailto:proximaeradigital@gmail.com?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body);});