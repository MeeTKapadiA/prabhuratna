import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getDefaultRouteForUser } from '../../config/navConfig';
import AuthModal from '../auth/AuthModal';
import Button from '../../components/ui/Button';
import { apiRequest } from '../../services/api';
import { formatCurrency } from '../../services/calcService';
import {
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  Star,
  ShieldCheck,
  Award,
  Users,
  CheckCircle2,
  Search,
  Lock,
  Sun,
  Moon,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  Gift,
  Flame,
  Check
} from 'lucide-react';

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  // State
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Inquiry Form State
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryPhone, setInquiryPhone] = useState('');
  const [inquiryCategory, setInquiryCategory] = useState('Stainless Steel Cookware & Utensils');
  const [inquiryMessage, setInquiryMessage] = useState('');

  // Live Store Status calculation
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  useEffect(() => {
    const hours = new Date().getHours();
    setIsStoreOpen(hours >= 9 && hours < 21);
  }, []);

  // Default Featured Catalog Items Preset
  const defaultCatalog = [
    {
      id: 'd1',
      name: "Heavy Gauge Stainless Steel Kadhai & Cookware",
      category: "utensils",
      categoryName: "Steel & Utensils",
      tag: "Top Seller",
      image: "/assets/cat_steel_utensils.png",
      desc: "Heavy-bottom tri-ply steel kadhais with induction & gas support. Rust-proof, food-grade 304 stainless steel.",
      features: ["304 Food Grade Steel", "Tri-ply Induction Bottom", "Lifetime Durability"],
      priceText: "Best Wholesale Rate",
      brands: "Hawkins / Prestige / Vinod"
    },
    {
      id: 'd2',
      name: "Complete Stainless Steel Thali & Dinner Set (51 Pcs)",
      category: "utensils",
      categoryName: "Steel & Utensils",
      tag: "Family Favorite",
      image: "/assets/cat_steel_utensils.png",
      desc: "Complete 51-piece glossy finish stainless steel dinner set with thalis, bowls, glasses, spoons, and serving dishes.",
      features: ["51 Pieces Set", "Mirror Finish", "Dishwasher Safe"],
      priceText: "Special Combo Price",
      brands: "Prabhuratna Premium"
    },
    {
      id: 'd3',
      name: "Commercial & Home Heavy Duty Mixer Grinder",
      category: "kitchen",
      categoryName: "Kitchen Appliances",
      tag: "Best Value",
      image: "/assets/cat_kitchen_appliances.png",
      desc: "750W to 1000W high-speed copper motor mixer grinders with 3-4 stainless steel jars for chutney, dry grinding & wet batter.",
      features: ["1000W Copper Motor", "Leak-Proof Jars", "2-Year Warranty"],
      priceText: "Exclusive Discount",
      brands: "Bajaj / Sujata / Philips"
    },
    {
      id: 'd4',
      name: "Glass Top 2 & 3 Burner Gas Stoves",
      category: "kitchen",
      categoryName: "Kitchen Appliances",
      tag: "Modern Design",
      image: "/assets/cat_kitchen_appliances.png",
      desc: "Toughened glass top gas stove with heavy brass burners for fuel efficiency, auto-ignition, and rust-resistant body.",
      features: ["Toughened Glass", "Heavy Brass Burners", "Auto Ignition"],
      priceText: "Wholesale Rate",
      brands: "Prestige / Sunflame"
    },
    {
      id: 'd5',
      name: "High-Speed Decorative Ceiling Fans",
      category: "home",
      categoryName: "Home Appliances",
      tag: "Energy Efficient",
      image: "/assets/cat_home_appliances.png",
      desc: "5-star energy rated BLDC and high-speed ceiling fans with dust-resistant coating and whisper-quiet motor performance.",
      features: ["5-Star Energy Saver", "400 RPM High Speed", "Anti-Dust"],
      priceText: "Best Local Rate",
      brands: "Havells / Crompton / Bajaj"
    },
    {
      id: 'd6',
      name: "Storage Water Heater / Geyser (15L / 25L)",
      category: "home",
      categoryName: "Home Appliances",
      tag: "Winter Essential",
      image: "/assets/cat_home_appliances.png",
      desc: "Instant and storage geysers with glass-lined tank protection against hard water, digital temperature control, and safety valve.",
      features: ["Hard Water Protection", "Fast Heating", "5-Star Rated"],
      priceText: "Attractive Offer",
      brands: "Crompton / Bajaj / V-Guard"
    },
    {
      id: 'd7',
      name: "Pure Copper Water Dispenser & Jug Set",
      category: "copper",
      categoryName: "Copper & Brass",
      tag: "Ayurvedic Health",
      image: "/assets/cat_copper_brass.png",
      desc: "100% pure hand-hammered copper water dispenser matka (5L/10L) with brass tap and matching copper drinkware bottles.",
      features: ["100% Pure Copper", "Ayurvedic Benefits", "Hand-Hammered"],
      priceText: "Genuine Guaranteed",
      brands: "Crafted Heritage"
    },
    {
      id: 'd8',
      name: "Traditional Glossy Brass Puja Thali & Decor",
      category: "copper",
      categoryName: "Copper & Brass",
      tag: "Festive Special",
      image: "/assets/cat_copper_brass.png",
      desc: "Authentic brass puja thali sets, diyas, brass samai, and traditional serving vessels crafted with high precision.",
      features: ["Heavy Brass", "Traditional Craft", "Long-Lasting Shine"],
      priceText: "Best Rates",
      brands: "Prabhuratna Special"
    },
    {
      id: 'd9',
      name: "Royal Shaadi Marriage Gift Hamper Box",
      category: "gift",
      categoryName: "Gift Sets",
      tag: "Marriage Special",
      image: "/assets/cat_gift_sets.png",
      desc: "Comprehensive 51 to 101 piece marriage gift luggage hampers containing premium utensils, pressure cookers, and appliances.",
      features: ["51-101 Pcs Combo", "Custom Gift Box", "Full Marriage Kit"],
      priceText: "Custom Package Rate",
      brands: "Prabhuratna Marriage Hampers"
    }
  ];

  const [dbProducts, setDbProducts] = useState([]);
  const [useLiveDb, setUseLiveDb] = useState(false);

  // Fetch live products selected by Admin
  useEffect(() => {
    async function loadPublicCatalog() {
      try {
        const res = await apiRequest('/products/public');
        if (res.success && res.products && res.products.length > 0) {
          const mapped = res.products.map((p) => {
            let catKey = 'utensils';
            let catName = 'Steel & Utensils';
            let img = '/assets/cat_steel_utensils.png';

            const c = (p.category || '').toLowerCase();
            if (c.includes('appl') || c.includes('kitchen')) {
              catKey = 'kitchen';
              catName = 'Kitchen Appliances';
              img = '/assets/cat_kitchen_appliances.png';
            } else if (c.includes('home') || c.includes('fan') || c.includes('geyser')) {
              catKey = 'home';
              catName = 'Home Appliances';
              img = '/assets/cat_home_appliances.png';
            } else if (c.includes('copper') || c.includes('brass') || c.includes('drink')) {
              catKey = 'copper';
              catName = 'Copper & Brass';
              img = '/assets/cat_copper_brass.png';
            } else if (c.includes('gift') || c.includes('marriage')) {
              catKey = 'gift';
              catName = 'Gift Sets';
              img = '/assets/cat_gift_sets.png';
            }

            return {
              id: p.id,
              name: p.name,
              category: catKey,
              categoryName: catName,
              tag: p.brand || 'Featured',
              image: p.image || img,
              desc: p.description || `${p.name} - Premium quality item available at Prabhuratna Metals.`,
              features: [`SKU: ${p.sku || 'N/A'}`, `GST: ${p.gst_rate}%`, 'In Stock at Store'],
              priceText: p.selling_price ? formatCurrency(p.selling_price) : 'Wholesale Rate',
              brands: p.brand || 'Prabhuratna'
            };
          });
          setDbProducts(mapped);
          setUseLiveDb(true);
        }
      } catch (err) {
        console.warn('Could not fetch live public products, using default showcase catalog', err);
      }
    }
    loadPublicCatalog();
  }, []);

  const displayList = useLiveDb ? dbProducts : defaultCatalog;

  // Filtered Products
  const filteredProducts = displayList.filter((p) => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brands.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleInquirySubmit = (e) => {
    e.preventDefault();
    const text = `Hi Prabhuratna Metals, I would like to inquire about ${inquiryCategory}.\nName: ${inquiryName}\nPhone: ${inquiryPhone}\nRequirements: ${inquiryMessage}`;
    const whatsappUrl = `https://wa.me/919824493420?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF8] dark:bg-[#121417] text-[#1A1A1A] dark:text-[#F1F1F1] flex flex-col font-sans transition-colors duration-200">
      
      {/* 1. Top Announcement Bar */}
      <div className="bg-[#1E2126] dark:bg-[#121417] text-[#F1F1F1] text-xs font-semibold py-2 px-4 border-b border-[#2D3138]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#C0392B] dark:bg-[#E74C3C] text-white font-bold text-[10px] uppercase">Festive Offer</span>
            <span>Best Wholesale Rates for Kitchenware & Appliances in Vapi!</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#9CA3AF]">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#C0392B] dark:text-[#E74C3C]" /> Opp. Union Bank, Ibrahim Market, Vapi East
            </span>
            <span className="hidden md:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#94A3B8]" /> Open Daily: 9:00 AM – 9:00 PM
            </span>
          </div>
        </div>
      </div>

      {/* 2. Main Store Header */}
      <header className="border-b border-[#E5E7EB] dark:border-[#2D3138] bg-[#FFFFFF] dark:bg-[#1E2126] sticky top-0 z-40 px-4 sm:px-8 py-3 flex items-center justify-between flex-nowrap transition-colors shadow-sm">
        {/* Brand Logo */}
        <a href="#home" className="flex items-center gap-3 flex-shrink-0">
          <div className="w-10 h-10 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] flex items-center justify-center font-extrabold text-white text-xl shadow-md">
            P
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-[#1A1A1A] dark:text-[#F1F1F1] block leading-none">PRABHURATNA</span>
            <span className="text-[10px] text-[#C0392B] dark:text-[#E74C3C] font-bold uppercase tracking-widest block mt-0.5">METALS & APPLIANCES</span>
          </div>
        </a>

        {/* Navigation Links */}
        <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold text-[#4A5568] dark:text-[#94A3B8]">
          <a href="#home" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C] transition-colors">Home</a>
          <a href="#about" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C] transition-colors">About Us</a>
          <a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C] transition-colors">Products Catalog</a>
          <a href="#why-us" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C] transition-colors">Why Choose Us</a>
          <a href="#reviews" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C] transition-colors">Reviews</a>
          <a href="#contact" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C] transition-colors">Location & Contact</a>
        </nav>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Store Status Badge */}
          <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            isStoreOpen ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/30'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`}></span>
            <span>{isStoreOpen ? 'Open Now • Closes 9 PM' : 'Opens 9 AM Daily'}</span>
          </div>

          {/* Call Direct */}
          <a
            href="tel:09824493420"
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] dark:hover:bg-[#EC7063] text-white font-bold text-xs shadow-sm transition-all"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>098244 93420</span>
          </a>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            className="p-2 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] hover:bg-[#E5E7EB] dark:hover:bg-[#2D3138] text-[#1A1A1A] dark:text-[#F1F1F1] border border-[#E5E7EB] dark:border-[#2D3138] transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#4A5568]" />}
          </button>

          {/* Staff Login / ERP Access CTA */}
          {isAuthenticated ? (
            <Button onClick={() => navigate('/app/dashboard')} variant="primary" size="sm" icon={ChevronRight} iconPosition="right">
              POS Dashboard
            </Button>
          ) : (
            <button
              onClick={() => setAuthModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4A5568] dark:bg-[#2D3138] hover:bg-[#1A1A1A] dark:hover:bg-[#1E2126] text-white font-bold text-xs border border-[#E5E7EB] dark:border-[#2D3138] transition-all"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Staff POS Login</span>
            </button>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl text-[#4A5568] dark:text-[#94A3B8] hover:text-[#1A1A1A] dark:hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#FFFFFF] dark:bg-[#1E2126] border-b border-[#E5E7EB] dark:border-[#2D3138] p-4 space-y-3 font-semibold text-sm">
          <a href="#home" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#1A1A1A] dark:text-[#F1F1F1]">Home</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#1A1A1A] dark:text-[#F1F1F1]">About Us</a>
          <a href="#catalog" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#1A1A1A] dark:text-[#F1F1F1]">Products Catalog</a>
          <a href="#why-us" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#1A1A1A] dark:text-[#F1F1F1]">Why Choose Us</a>
          <a href="#reviews" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#1A1A1A] dark:text-[#F1F1F1]">Reviews</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="block py-1 text-[#1A1A1A] dark:text-[#F1F1F1]">Location & Contact</a>
        </div>
      )}

      {/* 3. Customer Showroom Hero Section */}
      <section id="home" className="relative py-12 sm:py-20 px-4 sm:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Hero Content */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 border border-[#C0392B]/20 dark:border-[#E74C3C]/20 text-[#C0392B] dark:text-[#E74C3C] text-xs font-bold">
              <Sparkles className="w-4 h-4" /> Vapi's Premier Utensils & Home Appliances Store
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#1A1A1A] dark:text-[#F1F1F1] leading-tight">
              Quality Kitchenware & <br />
              <span className="text-[#C0392B] dark:text-[#E74C3C]">
                Home Appliances in Vapi
              </span>
            </h1>

            <p className="text-[#6B7280] dark:text-[#9CA3AF] text-base sm:text-lg max-w-xl leading-relaxed mx-auto lg:mx-0">
              Discover heavy-grade stainless steel utensils, traditional brass & copperware, mixer grinders, gas stoves, ceiling fans, water heaters, and complete marriage gift hampers at unbeatable prices in Ibrahim Market, Vapi East.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4">
              <a
                href="tel:09824493420"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] dark:hover:bg-[#EC7063] text-white font-bold text-sm shadow-md transition-all"
              >
                <Phone className="w-4 h-4" />
                <span>Call Store: 098244 93420</span>
              </a>

              <a
                href="https://wa.me/919824493420?text=Hi%20Prabhuratna%20Metals%20and%20Appliances%2C%20I%20want%20to%20inquire%20about%20products."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-[#1E2126] dark:bg-[#2D3138] hover:bg-[#1A1A1A] dark:hover:bg-[#1E2126] text-white font-bold text-sm border border-[#2D3138] transition-all"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Inquiry</span>
              </a>
            </div>

            {/* Social Trust Stats Row */}
            <div className="pt-6 border-t border-[#E5E7EB] dark:border-[#2D3138] grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-[#C0392B] dark:text-[#E74C3C] flex items-center justify-center gap-1">
                  5.0 <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </span>
                <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] block mt-0.5">Google Rating</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">10,000+</span>
                <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] block mt-0.5">Happy Families</span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-extrabold text-[#4A5568] dark:text-[#94A3B8]">100%</span>
                <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#9CA3AF] block mt-0.5">Genuine Brands</span>
              </div>
            </div>
          </div>

          {/* Right Showroom Image Container - Full Image Uncropped Visibility */}
          <div className="relative">
            <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-3.5 rounded-3xl border border-[#E5E7EB] dark:border-[#2D3138] shadow-lg">
              <div className="w-full rounded-2xl overflow-hidden bg-[#FAFAF8] dark:bg-[#121417] flex items-center justify-center p-1">
                <img
                  src="/assets/hero_showroom.png"
                  alt="Prabhuratna Metals Showroom Display"
                  className="w-full h-auto max-h-[460px] object-contain rounded-xl transition-transform duration-300"
                />
              </div>
              <div className="p-4 bg-[#FAFAF8] dark:bg-[#121417] rounded-xl mt-3 flex items-center justify-between border border-[#E5E7EB] dark:border-[#2D3138]">
                <div>
                  <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Prabhuratna Metals Showroom</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Ibrahim Market, Main Road, Vapi East</p>
                </div>
                <a
                  href="https://maps.google.com/?q=Prabhuratna+Metals+and+Appliances+Main+Road+Ibrahim+Market+Vapi+East+Gujarat+396191"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[#C0392B]/10 dark:bg-[#E74C3C]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold text-xs hover:bg-[#C0392B]/20"
                >
                  📍 Directions
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. About Us Section */}
      <section id="about" className="py-16 px-4 sm:px-8 bg-[#FFFFFF] dark:bg-[#1E2126] border-t border-b border-[#E5E7EB] dark:border-[#2D3138]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-[#E74C3C]">About Prabhuratna</span>
            <h2 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1] leading-tight">
              Your Most Trusted Partner for Utensils & Home Appliances in Vapi
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Located in Ibrahim Market, Vapi East, <strong>Prabhuratna Metals and Appliances</strong> has built an unmatched reputation for providing heavy-duty stainless steel cookware, traditional brass & copper items, and authorized top-brand home appliances.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-[#E5E7EB] dark:border-[#2D3138] flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold">🛡️</div>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Heavy-Gauge Steel</h4>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">304 food-grade stainless steel utensils that never dent or rust.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-[#E5E7EB] dark:border-[#2D3138] flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold">⚡</div>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Authorized Brands</h4>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Hawkins, Prestige, Bajaj, Havells, Philips, Crompton & Sujata.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-[#E5E7EB] dark:border-[#2D3138] flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold">🏷️</div>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Wholesale Rates</h4>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Direct manufacturer pricing with transparent rates for families.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#FAFAF8] dark:bg-[#121417] border border-[#E5E7EB] dark:border-[#2D3138] flex items-start gap-3">
                <div className="p-2 rounded-lg bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold">🎁</div>
                <div>
                  <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Marriage Gift Combos</h4>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-0.5">Complete 51 to 101 piece shaadi sets & festive hamper boxes.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <img src="/assets/cat_steel_utensils.png" alt="Steel Utensils" className="rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] shadow-sm h-48 w-full object-cover" />
            <img src="/assets/cat_kitchen_appliances.png" alt="Kitchen Appliances" className="rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] shadow-sm h-48 w-full object-cover" />
            <img src="/assets/cat_copper_brass.png" alt="Copper Brassware" className="rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] shadow-sm h-48 w-full object-cover" />
            <img src="/assets/cat_gift_sets.png" alt="Marriage Gift Sets" className="rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] shadow-sm h-48 w-full object-cover" />
          </div>
        </div>
      </section>

      {/* 5. Product Catalog Showcase Section */}
      <section id="catalog" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-[#E74C3C] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> Featured Store Products
          </span>
          <h2 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">Live Customer Product Catalog</h2>
          <p className="text-xs sm:text-sm text-[#6B7280] dark:text-[#9CA3AF]">
            {useLiveDb ? 'Displaying live products selected by Store Administration' : 'From heavy-bottom cookware to high-speed mixer grinders and festive gift sets'}
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-semibold">
          {[
            { id: 'all', label: 'All Products' },
            { id: 'utensils', label: 'Steel & Utensils' },
            { id: 'kitchen', label: 'Kitchen Appliances' },
            { id: 'home', label: 'Home Appliances' },
            { id: 'copper', label: 'Copper & Brass' },
            { id: 'gift', label: 'Gift & Marriage Sets' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`px-4 py-2 rounded-xl transition-all ${
                activeCategory === tab.id
                  ? 'bg-[#C0392B] dark:bg-[#E74C3C] text-white shadow-sm'
                  : 'bg-[#FFFFFF] dark:bg-[#1E2126] text-[#4A5568] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#2D3138] hover:bg-[#FAFAF8] dark:hover:bg-[#121417]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#6B7280] dark:text-[#9CA3AF] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search kadhai, mixer grinder, geyser, copper jug, thali set..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#FFFFFF] dark:bg-[#1E2126] border border-[#E5E7EB] dark:border-[#2D3138] rounded-xl text-xs text-[#1A1A1A] dark:text-[#F1F1F1] placeholder-[#6B7280] dark:placeholder-[#9CA3AF] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
          />
        </div>

        {/* Dynamic Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => (
            <div key={p.id} className="bg-[#FFFFFF] dark:bg-[#1E2126] rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] overflow-hidden group hover:border-[#C0392B]/40 dark:hover:border-[#E74C3C]/40 transition-all flex flex-col justify-between shadow-sm">
              <div>
                <div className="relative h-48 overflow-hidden bg-[#FAFAF8] dark:bg-[#121417]">
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#C0392B] text-white font-bold text-[10px]">
                    {p.tag}
                  </span>
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-[#121417]/80 text-[#94A3B8] font-bold text-[10px]">
                    {p.categoryName}
                  </span>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-base leading-snug">{p.name}</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">{p.desc}</p>
                  
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.features.map((feat, idx) => (
                      <span key={idx} className="px-2 py-0.5 rounded bg-[#FAFAF8] dark:bg-[#121417] border border-[#E5E7EB] dark:border-[#2D3138] text-[10px] text-[#4A5568] dark:text-[#94A3B8] font-medium">
                        ✓ {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[#E5E7EB] dark:border-[#2D3138] flex items-center justify-between bg-[#FAFAF8] dark:bg-[#121417]">
                <div>
                  <span className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF] block">Pricing Info</span>
                  <span className="text-sm font-extrabold text-[#C0392B] dark:text-[#E74C3C]">{p.priceText}</span>
                </div>
                <a
                  href={`https://wa.me/919824493420?text=${encodeURIComponent(`Hi Prabhuratna Metals, I want to inquire about: ${p.name}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] dark:hover:bg-[#EC7063] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Inquire Rate</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. Why Choose Us Section */}
      <section id="why-us" className="py-16 px-4 sm:px-8 bg-[#FFFFFF] dark:bg-[#1E2126] border-t border-b border-[#E5E7EB] dark:border-[#2D3138]">
        <div className="max-w-7xl mx-auto space-y-8 text-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-[#E74C3C]">Why Choose Us</span>
            <h2 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">The Local Gold Standard in Quality</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-[#FAFAF8] dark:bg-[#121417] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] text-left space-y-3">
              <div className="p-3 w-10 h-10 rounded-xl bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center">🏆</div>
              <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-base">100% Genuine Brands</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">Original items from top-tier brands with official manufacturer warranty and bill.</p>
            </div>

            <div className="bg-[#FAFAF8] dark:bg-[#121417] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] text-left space-y-3">
              <div className="p-3 w-10 h-10 rounded-xl bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center">💰</div>
              <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-base">Wholesale & Retail Rates</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">Maximum value with competitive wholesale pricing for families and bulk buyers.</p>
            </div>

            <div className="bg-[#FAFAF8] dark:bg-[#121417] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] text-left space-y-3">
              <div className="p-3 w-10 h-10 rounded-xl bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center">⭐</div>
              <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-base">5.0 Star Rated on Google</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">Rated 5 stars by local customers in Vapi for honest guidance and fair pricing.</p>
            </div>

            <div className="bg-[#FAFAF8] dark:bg-[#121417] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] text-left space-y-3">
              <div className="p-3 w-10 h-10 rounded-xl bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center">🤝</div>
              <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-base">Local & Reliable Support</h3>
              <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">Prompt after-sales assistance, exchange support, and guidance for every customer.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Customer Reviews Section */}
      <section id="reviews" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-[#E74C3C]">Google Customer Reviews</span>
          <h2 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">Loved by Thousands in Vapi</h2>
        </div>

        <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] flex flex-col sm:flex-row items-center justify-between gap-6 max-w-3xl mx-auto shadow-sm">
          <div className="flex items-center gap-4">
            <span className="text-4xl font-extrabold text-[#C0392B] dark:text-[#E74C3C]">5.0</span>
            <div>
              <div className="flex text-amber-400 text-base">★★★★★</div>
              <p className="text-xs text-[#1A1A1A] dark:text-[#F1F1F1] font-semibold">Perfect Score on Google Reviews</p>
            </div>
          </div>
          <a
            href="https://maps.google.com/?q=Prabhuratna+Metals+and+Appliances+Main+Road+Ibrahim+Market+Vapi+East+Gujarat+396191"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] dark:hover:bg-[#EC7063] text-white font-bold text-xs"
          >
            ★ View Google Reviews
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center text-xs">RP</div>
              <div>
                <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Ramesh Patel</h4>
                <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Vapi East Resident</p>
              </div>
            </div>
            <div className="text-amber-400 text-xs">★★★★★</div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              "Very high quality steel utensils and excellent pricing. Bought a cookware set and mixer grinder. Staff behavior is very polite and helpful!"
            </p>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center text-xs">AD</div>
              <div>
                <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Ananya Desai</h4>
                <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Vapi, Gujarat</p>
              </div>
            </div>
            <div className="text-amber-400 text-xs">★★★★★</div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              "Purchased a 51-piece marriage gift set. The packing was beautiful and stainless steel quality is super heavy and durable. Best store in Ibrahim Market!"
            </p>
          </div>

          <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-5 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] space-y-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold flex items-center justify-center text-xs">VS</div>
              <div>
                <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Vikram Singh</h4>
                <p className="text-[10px] text-[#6B7280] dark:text-[#9CA3AF]">Shanti Nagar, Vapi</p>
              </div>
            </div>
            <div className="text-amber-400 text-xs">★★★★★</div>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              "Got a Crompton geyser and Bajaj ceiling fans at wholesale rates. 100% genuine brand with proper warranty card. 5 star experience!"
            </p>
          </div>
        </div>
      </section>

      {/* 8. Quick Price Inquiry Form Section */}
      <section className="py-16 px-4 sm:px-8 bg-[#FFFFFF] dark:bg-[#1E2126] border-t border-b border-[#E5E7EB] dark:border-[#2D3138]">
        <div className="max-w-3xl mx-auto bg-[#FAFAF8] dark:bg-[#121417] p-6 sm:p-8 rounded-3xl border border-[#E5E7EB] dark:border-[#2D3138] space-y-6 shadow-sm">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-[#E74C3C]">Quick Price Quote</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">Need Price Quote or Product Info?</h2>
            <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Fill in your details below to connect directly on WhatsApp!</p>
          </div>

          <form onSubmit={handleInquirySubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5568] dark:text-[#94A3B8] mb-1">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  placeholder="e.g. Rajesh Shah"
                  className="w-full p-2.5 bg-[#FFFFFF] dark:bg-[#1E2126] border border-[#E5E7EB] dark:border-[#2D3138] rounded-xl text-xs text-[#1A1A1A] dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5568] dark:text-[#94A3B8] mb-1">Phone / Mobile Number *</label>
                <input
                  type="tel"
                  required
                  value={inquiryPhone}
                  onChange={(e) => setInquiryPhone(e.target.value)}
                  placeholder="e.g. 09824493420"
                  className="w-full p-2.5 bg-[#FFFFFF] dark:bg-[#1E2126] border border-[#E5E7EB] dark:border-[#2D3138] rounded-xl text-xs text-[#1A1A1A] dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5568] dark:text-[#94A3B8] mb-1">Product Category</label>
              <select
                value={inquiryCategory}
                onChange={(e) => setInquiryCategory(e.target.value)}
                className="w-full p-2.5 bg-[#FFFFFF] dark:bg-[#1E2126] border border-[#E5E7EB] dark:border-[#2D3138] rounded-xl text-xs text-[#1A1A1A] dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
              >
                <option value="Stainless Steel Cookware & Utensils">Stainless Steel Cookware & Utensils</option>
                <option value="Kitchen Appliances (Mixer, Gas Stove, Induction)">Kitchen Appliances (Mixer, Gas Stove, Induction)</option>
                <option value="Home Appliances (Fans, Irons, Geysers)">Home Appliances (Fans, Irons, Geysers)</option>
                <option value="Copperware & Brass Items">Copperware & Brass Items</option>
                <option value="Marriage / Festive Gift Combo Sets">Marriage / Festive Gift Combo Sets</option>
                <option value="Bulk / Wholesale Inquiry">Bulk / Wholesale Inquiry</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A5568] dark:text-[#94A3B8] mb-1">Requirements / Product Names</label>
              <textarea
                rows={3}
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder="Tell us what items or brands you are looking for..."
                className="w-full p-2.5 bg-[#FFFFFF] dark:bg-[#1E2126] border border-[#E5E7EB] dark:border-[#2D3138] rounded-xl text-xs text-[#1A1A1A] dark:text-[#F1F1F1] focus:outline-none focus:border-[#C0392B] dark:focus:border-[#E74C3C]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-[#C0392B] dark:bg-[#E74C3C] hover:bg-[#A93226] dark:hover:bg-[#EC7063] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Submit & Inquire via WhatsApp</span>
            </button>
          </form>
        </div>
      </section>

      {/* 9. Location & Contact Section */}
      <section id="contact" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#C0392B] dark:text-[#E74C3C]">Store Location</span>
          <h2 className="text-3xl font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1]">Visit Our Showroom in Vapi East</h2>
          <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF]">Conveniently located on Main Road, opposite Union Bank of India in Ibrahim Market</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-6 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] space-y-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C]">📍</div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Store Address</h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1 leading-relaxed">
                  <strong>Prabhuratna Metals and Appliances</strong><br />
                  Main Road, Opposite Union Bank of India,<br />
                  Ibrahim Market, Vapi East, Shanti Nagar, Vapi, Gujarat 396191
                </p>
                <a
                  href="https://maps.google.com/?q=Prabhuratna+Metals+and+Appliances+Main+Road+Ibrahim+Market+Vapi+East+Gujarat+396191"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#C0392B] dark:text-[#E74C3C] hover:underline font-bold block mt-2"
                >
                  Get Map Directions ➔
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C]">📞</div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Phone Contact</h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                  Direct Call: <a href="tel:09824493420" className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1]">098244 93420</a>
                </p>
                <a
                  href="tel:09824493420"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#C0392B]/10 text-[#C0392B] dark:text-[#E74C3C] font-bold text-xs mt-2"
                >
                  📞 Call Now
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-[#4A5568]/10 text-[#4A5568] dark:text-[#94A3B8]">🕒</div>
              <div>
                <h3 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">Business Hours</h3>
                <p className="text-xs text-[#6B7280] dark:text-[#9CA3AF] mt-1">
                  Monday – Sunday: 9:00 AM – 9:00 PM (Open Daily)
                </p>
              </div>
            </div>
          </div>

          {/* Embedded Google Map */}
          <div className="bg-[#FFFFFF] dark:bg-[#1E2126] p-2 rounded-2xl border border-[#E5E7EB] dark:border-[#2D3138] overflow-hidden h-[340px] shadow-sm">
            <iframe
              className="w-full h-full rounded-xl"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3739.757049872584!2d72.9360813!3d20.3722955!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be0ce2c85555555%3A0x123456789abcdef!2sIbrahim%20Market%2C%20Vapi%20East%2C%20Gujarat%20396191!5e0!3m2!1sen!2sin!4v1700000000000!5m2!1sen!2sin"
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Prabhuratna Metals Location Map"
            />
          </div>
        </div>
      </section>

      {/* 10. Footer */}
      <footer className="border-t border-[#E5E7EB] dark:border-[#2D3138] py-10 px-4 sm:px-8 bg-[#FFFFFF] dark:bg-[#1E2126]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#C0392B] dark:bg-[#E74C3C] flex items-center justify-center font-bold text-white">P</div>
              <span className="font-extrabold text-[#1A1A1A] dark:text-[#F1F1F1] text-sm">PRABHURATNA</span>
            </div>
            <p className="text-[#6B7280] dark:text-[#9CA3AF] leading-relaxed">
              Vapi's premier store for heavy-duty stainless steel cookware, authentic brass & copperware, and leading home appliances.
            </p>
            <div className="text-[#C0392B] dark:text-[#E74C3C] font-bold">★ 5.0 Google Rating</div>
          </div>

          <div>
            <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] uppercase tracking-wider mb-3">Quick Links</h4>
            <ul className="space-y-2 text-[#6B7280] dark:text-[#9CA3AF]">
              <li><a href="#home" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Home</a></li>
              <li><a href="#about" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">About Us</a></li>
              <li><a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Products Catalog</a></li>
              <li><a href="#why-us" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Why Choose Us</a></li>
              <li><a href="#reviews" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Customer Reviews</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] uppercase tracking-wider mb-3">Categories</h4>
            <ul className="space-y-2 text-[#6B7280] dark:text-[#9CA3AF]">
              <li><a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Steel Cookware & Kadhai</a></li>
              <li><a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Dinner Thali Sets</a></li>
              <li><a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Mixer Grinders & Stoves</a></li>
              <li><a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Geysers & Ceiling Fans</a></li>
              <li><a href="#catalog" className="hover:text-[#C0392B] dark:hover:text-[#E74C3C]">Marriage Gift Hampers</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#1A1A1A] dark:text-[#F1F1F1] uppercase tracking-wider mb-3">Store Contact</h4>
            <div className="space-y-2 text-[#6B7280] dark:text-[#9CA3AF]">
              <p>📍 Main Road, Opp. Union Bank of India, Ibrahim Market, Vapi East, Gujarat 396191</p>
              <p>📞 Call: <a href="tel:09824493420" className="text-[#1A1A1A] dark:text-[#F1F1F1] font-bold">098244 93420</a></p>
              <p>🕒 Open Daily 9:00 AM - 9:00 PM</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 mt-8 border-t border-[#E5E7EB] dark:border-[#2D3138] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#6B7280] dark:text-[#9CA3AF] gap-4">
          <p>© 2026 Prabhuratna Metals and Appliances. All Rights Reserved.</p>
          <button
            onClick={() => setAuthModalOpen(true)}
            className="text-[#4A5568] dark:text-[#94A3B8] hover:text-[#C0392B] dark:hover:text-[#E74C3C] underline font-semibold flex items-center gap-1"
          >
            <Lock className="w-3 h-3" /> Store Staff Login / Access POS System
          </button>
        </div>
      </footer>

      {/* Floating Mobile Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 sm:hidden bg-[#FFFFFF]/95 dark:bg-[#1E2126]/95 backdrop-blur-md border-t border-[#E5E7EB] dark:border-[#2D3138] p-2 flex items-center justify-around">
        <a href="tel:09824493420" className="flex flex-col items-center text-[#C0392B] dark:text-[#E74C3C] font-bold text-[10px]">
          <Phone className="w-5 h-5" />
          <span>Call Now</span>
        </a>
        <a
          href="https://wa.me/919824493420?text=Hi%20Prabhuratna%20Metals%20and%20Appliances%2C%20I%20have%20an%20inquiry."
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center text-emerald-600 dark:text-emerald-400 font-bold text-[10px]"
        >
          <MessageCircle className="w-5 h-5" />
          <span>WhatsApp</span>
        </a>
        <a
          href="https://maps.google.com/?q=Prabhuratna+Metals+and+Appliances+Main+Road+Ibrahim+Market+Vapi+East+Gujarat+396191"
          target="_blank"
          rel="noreferrer"
          className="flex flex-col items-center text-[#4A5568] dark:text-[#94A3B8] font-bold text-[10px]"
        >
          <MapPin className="w-5 h-5" />
          <span>Directions</span>
        </a>
      </div>

      {/* Staff Login / Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode="login"
        onSuccess={(user) => navigate(getDefaultRouteForUser(user))}
      />
    </div>
  );
}
