/* ==========================================================================
   Prabhuratna Metals and Appliances - Interactive JavaScript Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // --- Mobile Navigation Toggle ---
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const navMenu = document.getElementById('navMenu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (hamburgerBtn && navMenu) {
    hamburgerBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
      hamburgerBtn.classList.toggle('open');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburgerBtn.classList.remove('open');
      });
    });
  }

  // --- Dynamic Store Status Badge ---
  function updateStoreStatus() {
    const statusContainer = document.getElementById('storeStatusBadge');
    if (!statusContainer) return;

    const now = new Date();
    const hours = now.getHours();
    
    // Store hours: 9 AM (9:00) to 9 PM (21:00)
    const isOpen = hours >= 9 && hours < 21;

    if (isOpen) {
      statusContainer.className = 'badge-live';
      statusContainer.innerHTML = '● Open Now • Closes 9:00 PM';
    } else {
      statusContainer.className = 'badge-live';
      statusContainer.style.backgroundColor = '#FEE2E2';
      statusContainer.style.color = '#991B1B';
      statusContainer.innerHTML = '● Opens at 9:00 AM Daily';
    }
  }
  updateStoreStatus();

  // --- Product Data Array ---
  const productsData = [
    {
      id: 1,
      name: "Heavy Gauge Stainless Steel Kadhai & Cookware",
      category: "utensils",
      categoryName: "Steel & Utensils",
      tag: "Top Seller",
      image: "assets/cat_steel_utensils.png",
      desc: "Heavy-bottom tri-ply steel kadhais with induction & gas support. Rust-proof, food-grade 304 stainless steel.",
      features: ["304 Food Grade Steel", "Tri-ply Induction Bottom", "Lifetime Durability"],
      price: "Best Wholesale Rate",
      brands: "Hawkins / Prestige / Vinod"
    },
    {
      id: 2,
      name: "Complete Stainless Steel Thali & Dinner Set (51 Pcs)",
      category: "utensils",
      categoryName: "Steel & Utensils",
      tag: "Family Favorite",
      image: "assets/cat_steel_utensils.png",
      desc: "Complete 51-piece glossy finish stainless steel dinner set with thalis, bowls, glasses, spoons, and serving dishes.",
      features: ["51 Pieces", "Mirror Finish", "Easy Clean"],
      price: "Special Combo Price",
      brands: "Prabhuratna Premium"
    },
    {
      id: 3,
      name: "Commercial & Home Heavy Duty Mixer Grinder",
      category: "kitchen",
      categoryName: "Kitchen Appliances",
      tag: "Best Value",
      image: "assets/cat_kitchen_appliances.png",
      desc: "750W to 1000W high-speed copper motor mixer grinders with 3-4 stainless steel jars for chutney, dry grinding & wet batter.",
      features: ["1000W Copper Motor", "Leak-Proof Jars", "2-Year Warranty"],
      price: "Exclusive Discount",
      brands: "Bajaj / Sujata / Philips"
    },
    {
      id: 4,
      name: "Glass Top 2 & 3 Burner Gas Stoves",
      category: "kitchen",
      categoryName: "Kitchen Appliances",
      tag: "Modern Design",
      image: "assets/cat_kitchen_appliances.png",
      desc: "Toughened glass top gas stove with heavy brass burners for fuel efficiency, auto-ignition, and rust-resistant body.",
      features: ["Toughened Glass", "Heavy Brass Burners", "Auto Ignition"],
      price: "Wholesale Rate",
      brands: "Prestige / Sunflame"
    },
    {
      id: 5,
      name: "High-Speed Decorative Ceiling Fans",
      category: "home",
      categoryName: "Home Appliances",
      tag: "Energy Efficient",
      image: "assets/cat_home_appliances.png",
      desc: "5-star energy rated BLDC and high-speed ceiling fans with dust-resistant coating and whisper-quiet motor performance.",
      features: ["5-Star Energy Saver", "400 RPM High Speed", "Anti-Dust"],
      price: "Best Local Rate",
      brands: "Havells / Crompton / Bajaj"
    },
    {
      id: 6,
      name: "Storage Water Heater / Geyser (15L / 25L)",
      category: "home",
      categoryName: "Home Appliances",
      tag: "Winter Essential",
      image: "assets/cat_home_appliances.png",
      desc: "Instant and storage geysers with glass-lined tank protection against hard water, digital temperature control, and safety valve.",
      features: ["Hard Water Protection", "Fast Heating", "5-Star Rated"],
      price: "Attractive Offer",
      brands: "Crompton / Bajaj / V-Guard"
    },
    {
      id: 7,
      name: "Pure Copper Water Dispenser & Jug Set",
      category: "copper",
      categoryName: "Copper & Brass",
      tag: "Ayurvedic Health",
      image: "assets/cat_copper_brass.png",
      desc: "100% pure hand-hammered copper water dispenser matka (5L/10L) with brass tap and matching copper drinkware bottles.",
      features: ["100% Pure Copper", "Ayurvedic Benefits", "Hand-Hammered"],
      price: "Genuine Guaranteed",
      brands: "Crafted Heritage"
    },
    {
      id: 8,
      name: "Traditional Glossy Brass Puja Thali & Decor",
      category: "copper",
      categoryName: "Copper & Brass",
      tag: "Festive Special",
      image: "assets/cat_copper_brass.png",
      desc: "Authentic brass puja thali sets, diyas, brass samai, and traditional serving vessels crafted with high precision.",
      features: ["Heavy Brass", "Traditional Craft", "Long-Lasting Shine"],
      price: "Best Rates",
      brands: "Prabhuratna Special"
    },
    {
      id: 9,
      name: "Royal Shaadi Marriage Gift Hamper Box",
      category: "gift",
      categoryName: "Gift Sets",
      tag: "Wedding Favorite",
      image: "assets/cat_gift_sets.png",
      desc: "Luxury 51 to 101 piece marriage cookware & appliance combo box thoughtfully packed in velvet gold gift trunk.",
      features: ["Complete Home Setup", "Customizable Items", "Gift Packaging"],
      price: "Special Package Price",
      brands: "Prabhuratna Signature"
    }
  ];

  // --- Render Products & Catalog Filter ---
  const productsContainer = document.getElementById('productsContainer');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const catalogSearch = document.getElementById('catalogSearch');

  let currentCategory = 'all';
  let searchQuery = '';

  function renderProducts() {
    if (!productsContainer) return;

    const filtered = productsData.filter(item => {
      const matchesCategory = currentCategory === 'all' || item.category === currentCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery) ||
                            item.desc.toLowerCase().includes(searchQuery) ||
                            item.categoryName.toLowerCase().includes(searchQuery) ||
                            item.brands.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    if (filtered.length === 0) {
      productsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; background: white; border-radius: 16px; border: 1px solid #E2E8F0;">
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem; color: #0F172A;">No items matched your search</h3>
          <p style="color: #475569; margin-bottom: 1.5rem;">Try searching for "steel", "mixer", "geyser", "copper", or "gift".</p>
          <button class="btn btn-primary" onclick="resetFilters()">Reset Search Filter</button>
        </div>
      `;
      return;
    }

    productsContainer.innerHTML = filtered.map(item => `
      <div class="product-card" data-id="${item.id}">
        <div class="product-img-wrap">
          <img src="${item.image}" alt="${item.name}" class="product-img" loading="lazy">
          <span class="product-tag">${item.tag}</span>
        </div>
        <div class="product-body">
          <span class="product-category">${item.categoryName} • ${item.brands}</span>
          <h3 class="product-title">${item.name}</h3>
          <p class="product-desc">${item.desc}</p>
          
          <div class="product-features-tags">
            ${item.features.map(f => `<span class="product-feat-tag">✓ ${f}</span>`).join('')}
          </div>

          <div class="product-footer">
            <div>
              <div class="product-price-label">Price Info</div>
              <div class="product-price-val">${item.price}</div>
            </div>
            <button class="btn btn-primary btn-sm quick-view-btn" onclick="openProductModal(${item.id})">
              Quick View
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  window.resetFilters = function() {
    currentCategory = 'all';
    searchQuery = '';
    if (catalogSearch) catalogSearch.value = '';
    filterBtns.forEach(b => b.classList.remove('active'));
    filterBtns[0]?.classList.add('active');
    renderProducts();
  };

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.filter;
      renderProducts();
    });
  });

  if (catalogSearch) {
    catalogSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderProducts();
    });
  }

  renderProducts();

  // --- Modal / Lightbox Logic ---
  const modalOverlay = document.getElementById('productModal');
  const modalBody = document.getElementById('modalContent');
  const modalClose = document.getElementById('modalCloseBtn');

  window.openProductModal = function(id) {
    const item = productsData.find(p => p.id === id);
    if (!item || !modalOverlay || !modalBody) return;

    const waText = encodeURIComponent(`Hi Prabhuratna Metals and Appliances, I am interested in "${item.name}". Please share price & availability.`);
    const waLink = `https://wa.me/919824493420?text=${waText}`;
    const callLink = `tel:09824493420`;

    modalBody.innerHTML = `
      <div class="modal-grid">
        <div class="modal-img-wrap">
          <img src="${item.image}" alt="${item.name}" class="modal-img">
        </div>
        <div class="modal-body">
          <span class="product-category" style="margin-bottom:0.5rem; display:block;">${item.categoryName}</span>
          <h2 style="font-size: 1.4rem; font-weight: 700; color: #0F172A; margin-bottom: 0.75rem;">${item.name}</h2>
          <p style="font-size: 0.9rem; color: #475569; margin-bottom: 1.25rem;">${item.desc}</p>
          
          <div style="background-color: #F8FAFC; padding: 1rem; border-radius: 12px; margin-bottom: 1.5rem; border: 1px solid #E2E8F0;">
            <div style="font-size: 0.8rem; font-weight: 600; color: #9E1B32; text-transform: uppercase; margin-bottom: 0.5rem;">Key Specifications & Brands</div>
            <ul style="font-size: 0.875rem; color: #0F172A; display: flex; flex-direction: column; gap: 0.4rem;">
              <li><strong>Brands:</strong> ${item.brands}</li>
              ${item.features.map(f => `<li>✓ ${f}</li>`).join('')}
            </ul>
          </div>

          <div style="margin-top: auto; display: flex; flex-direction: column; gap: 0.75rem;">
            <a href="${waLink}" target="_blank" class="btn btn-whatsapp" style="width: 100%;">
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
              Inquire on WhatsApp
            </a>
            <a href="${callLink}" class="btn btn-primary" style="width: 100%;">
              📞 Call Store: 098244 93420
            </a>
          </div>
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');
  };

  if (modalClose) {
    modalClose.addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });
  }

  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }

  // --- Form Submission Handling ---
  const inquiryForm = document.getElementById('inquiryForm');
  if (inquiryForm) {
    inquiryForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const name = document.getElementById('formName').value.trim();
      const phone = document.getElementById('formPhone').value.trim();
      const category = document.getElementById('formCategory').value;
      const message = document.getElementById('formMessage').value.trim();

      const formattedText = encodeURIComponent(
        `*New Inquiry from Website*\n` +
        `👤 *Name:* ${name}\n` +
        `📞 *Phone:* ${phone}\n` +
        `🏷️ *Category:* ${category}\n` +
        `💬 *Message:* ${message || 'I would like to inquire about products and prices.'}`
      );

      const whatsappURL = `https://wa.me/919824493420?text=${formattedText}`;
      
      // Redirect to WhatsApp
      window.open(whatsappURL, '_blank');

      alert("Thank you! Opening WhatsApp to send your inquiry directly to Prabhuratna Metals and Appliances.");
      inquiryForm.reset();
    });
  }

});
