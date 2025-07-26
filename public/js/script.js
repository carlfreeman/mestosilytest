document.addEventListener('DOMContentLoaded', function() {
    initAnimations();
    initForm();
    initParallax();
});

function initParallax() {
    const hero = document.getElementById('hero');
    let lastScroll = 0;
    let ticking = false;

    window.addEventListener('scroll', function() {
        lastScroll = window.scrollY;
        
        if (!ticking) {
            window.requestAnimationFrame(() => {
                hero.style.transform = `translateY(${lastScroll * 0.3}px)`;
                ticking = false;
            });
            ticking = true;
        }
    });
}

function initForm() {
    const form = document.getElementById('callmeForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Валидация
        if (!form.name.value || !form.phone.value) {
            showMessage('Заполните обязательные поля', 'red');
            return;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name.value,
                    phone: form.phone.value,
                    message: form.message.value
                })
            });

            if (!response.ok) throw new Error('Ошибка сервера');
            
            const result = await response.json();
            showMessage(result.message || 'Успешно отправлено!', 'green');
            form.reset();
        } catch (error) {
            showMessage(error.message || 'Ошибка сети', 'red');
        }
    });
}

function showMessage(text, color) {
    const messageEl = document.getElementById('formMessage');
    if (!messageEl) return;
    
    messageEl.textContent = text;
    messageEl.style.color = color;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
        messageEl.style.display = 'none';
    }, 5000);
}

function initAnimations () {
    const contentBlocks = document.querySelectorAll('.content-block');
    const callmeForm = document.getElementById('callmeForm');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1
    });
    
    contentBlocks.forEach(block => {
        observer.observe(block);
    });
    
    document.addEventListener('DOMContentLoaded', function() {
        const infoSection = document.getElementById('info');
        const galleryItems = document.querySelectorAll('.gallery-item');
        
        window.addEventListener('scroll', function() {
            const scrollPosition = window.scrollY;
            const hero = document.getElementById('hero');
            hero.style.transform = `translateY(${scrollPosition * 0.3}px)`;
            
            if (scrollPosition > 100) {
                infoSection.classList.add('visible');
            }
            if (scrollPosition < 100) {
                infoSection.classList.remove('visible');
                hero.style.transform = `translateY(${scrollPosition * 0.2}px)`;
            }
        });
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });
        
        galleryItems.forEach(item => {
            observer.observe(item);
        });
        
        // Плавная прокрутка
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });
    });
};

document.addEventListener('DOMContentLoaded', function() {
    const infoSection = document.getElementById('info');
    const galleryItems = document.querySelectorAll('.gallery-item');
    
    window.addEventListener('scroll', function() {
        const scrollPosition = window.scrollY;
        const hero = document.getElementById('hero');
        hero.style.transform = `translateY(${scrollPosition * 0.3}px)`;
        
        if (scrollPosition > 100) {
            infoSection.classList.add('visible');
        }
        if (scrollPosition < 100) {
            infoSection.classList.remove('visible');
            hero.style.transform = `translateY(${scrollPosition * 0.2}px)`;
        }
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1 });
    
    galleryItems.forEach(item => {
        observer.observe(item);
    });
    
    // Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
  const contactForm = document.getElementById('callme-form');
  
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      // Очистка предыдущих ошибок
      clearErrors();
      
      // Показываем спиннер
      const submitBtn = document.getElementById('submit-btn');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        Отправка...
      `;
      
      try {
        const formData = {
          name: document.getElementById('name').value,
          phone: document.getElementById('phone').value,
          message: document.getElementById('message').value
        };
        
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (!data.success) {
          // Показываем все ошибки
          if (data.errors && data.errors.length > 0) {
            data.errors.forEach(error => {
              showError(error.field, error.message);
            });
          } else {
            showError('form', data.message || 'Произошла ошибка');
          }
        } else {
          // Успешная отправка
          contactForm.reset();
          showSuccess('Сообщение отправлено!');
        }
      } catch (error) {
        console.error('Error:', error);
        showError('form', 'Ошибка соединения с сервером');
      } finally {
        // Восстанавливаем кнопку
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
      }
    });
  }
  
  function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => el.remove());
    document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
  }
  
  function showError(field, message) {
    // Для общих ошибок формы
    if (field === 'form') {
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message alert alert-danger mt-3';
      errorElement.textContent = message;
      document.getElementById('submit-btn').after(errorElement);
      return;
    }
    
    // Для ошибок у конкретных полей
    const input = document.getElementById(field);
    if (input) {
      input.classList.add('is-invalid');
      
      const errorElement = document.createElement('div');
      errorElement.className = 'error-message invalid-feedback';
      errorElement.textContent = message;
      input.parentNode.appendChild(errorElement);
    }
  }
  
  function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'alert alert-success mt-3';
    successElement.textContent = message;
    contactForm.appendChild(successElement);
    
    setTimeout(() => {
      successElement.remove();
    }, 5000);
  }
});
