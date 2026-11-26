import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, ShieldCheck, Leaf, Truck, Mail } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { useStore } from '../context/StoreContext';
import SeoHead from '../components/SeoHead';

export function AboutPage() {
  return (
    <main>
      <section style={{ background: 'var(--bg-sky)', borderBottom: '1px solid var(--border)', padding: '56px 0' }}>
        <div className="container">
          <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
            ABOUT PRO PACKS · LOS ANGELES · EST. 2023
          </div>
          <h1 className="font-display" style={{ margin: '8px 0 14px', fontSize: 'clamp(32px, 4.5vw, 52px)' }}>
            DIRECT FROM THE VAULT. ZERO COMPROMISE.
          </h1>
          <p style={{ fontSize: 16, color: 'var(--fg-muted)', maxWidth: 660, lineHeight: 1.65 }}>
            PRO PACKS was built in Los Angeles to give wholesale buyers and craft enthusiasts direct
            access to small-batch indoor, exotic flower, and live-resin disposables without broker
            markups. Every harvest is hang-dried, jar-cured, and triple vacuum-sealed before it leaves
            our facility.
          </p>
        </div>
      </section>

      <section className="container" style={{ padding: '48px 16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
            <Leaf size={26} color="#7c3aed" style={{ marginBottom: 12 }} />
            <h2 className="font-display" style={{ fontSize: 18, margin: '0 0 8px' }}>
              HAND-SELECTED GENETICS
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
              We inspect trichome maturity, moisture content, and terpene profile on every lot before
              it hits the PRO PACKS menu.
            </p>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
            <ShieldCheck size={26} color="#7c3aed" style={{ marginBottom: 12 }} />
            <h2 className="font-display" style={{ fontSize: 18, margin: '0 0 8px' }}>
              TRIPLE VACUUM-SEALED
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
              Every pack is heat-sealed in heavy-duty mylar and triple vacuum-barriered for 100%
              discretion and freshness preservation.
            </p>
          </div>
          <div style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24 }}>
            <Truck size={26} color="#7c3aed" style={{ marginBottom: 12 }} />
            <h2 className="font-display" style={{ fontSize: 18, margin: '0 0 8px' }}>
              SAME-DAY DISPATCH
            </h2>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
              Orders placed before 4:00 PM PST ship the same business day with live tracking from
              our LA dispatch hub.
            </p>
          </div>
        </div>
        <div style={{ marginTop: 32 }}>
          <Link to="/menu" className="btn-primary">
            EXPLORE THE CATALOG
          </Link>
        </div>
      </section>
    </main>
  );
}

const FAQ_DATA = [
  {
    cat: 'SHIPPING & HANDLING',
    q: 'When does my order ship?',
    a: 'All confirmed orders placed before 4:00 PM PST ship the same business day. Orders placed after 4:00 PM PST ship first thing the next morning.',
  },
  {
    cat: 'SHIPPING & HANDLING',
    q: 'How is my order packaged?',
    a: 'Every batch is jar-cured, placed in a heavy-duty barrier bag, and triple vacuum-sealed with zero external odor or branding.',
  },
  {
    cat: 'SHIPPING & HANDLING',
    q: 'Do orders come with tracking & insurance?',
    a: 'Yes. Every PRO PACKS order receives a live tracking number immediately upon dispatch and full transit protection.',
  },
  {
    cat: 'ORDERING',
    q: 'How do I place an order on PRO PACKS?',
    a: 'Browse the Menu, pick your weight tier (QP, HP, P, or UNIT), add items to your cart, apply any promo code, and complete checkout online.',
  },
  {
    cat: 'ORDERING',
    q: 'How often do you drop new products?',
    a: 'We restock and drop fresh indoor, exotic, and cart batches daily. Check Today’s Drop or subscribe to our newsletter for alerts.',
  },
  {
    cat: 'PAYMENT',
    q: 'What payment methods do you accept?',
    a: 'We accept Credit/Debit Cards, Zelle, Cash App, Crypto (BTC/USDC), and Bank Wire.',
  },
];

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState(0);
  const [filter, setFilter] = useState('ALL');
  const [faqs, setFaqs] = useState(FAQ_DATA);

  React.useEffect(() => {
    apiFetch('/faqs')
      .then((d) => {
        if (d.faqs?.length) {
          setFaqs(d.faqs.map((f) => ({ cat: f.category, q: f.question, a: f.answer })));
        }
      })
      .catch(() => {});
  }, []);

  const items = filter === 'ALL' ? faqs : faqs.filter((f) => f.cat === filter);

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 860 }}>
      <SeoHead
        title="Frequently Asked Questions | PRO PACKS"
        description="Answers on shipping, triple vacuum-sealed packaging, bulk tiers, and payment methods at PRO PACKS."
        jsonLd={faqLd}
      />
      <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
        SUPPORT · PRO PACKS
      </div>
      <h1 className="font-display" style={{ margin: '6px 0 20px', fontSize: 'clamp(28px, 4vw, 42px)' }}>
        FREQUENTLY ASKED QUESTIONS
      </h1>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {['ALL', 'SHIPPING & HANDLING', 'ORDERING', 'PAYMENT'].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`pp-cat-pill ${filter === c ? 'active' : ''}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={item.q} style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                style={{
                  width: '100%',
                  padding: '16px 18px',
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: 15,
                }}
              >
                <span>{item.q}</span>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {isOpen && (
                <div style={{ padding: '0 18px 16px', fontSize: 14, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 32, background: 'var(--bg-sky)', border: '1px solid var(--accent)', padding: 22 }}>
        <div className="font-display" style={{ fontSize: 18, marginBottom: 6 }}>
          STILL HAVE QUESTIONS?
        </div>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--fg-muted)' }}>
          Our LA dispatch team is available 9:00 AM – 8:30 PM PST daily.
        </p>
        <Link to="/contact" className="btn-accent">
          CONTACT SUPPORT
        </Link>
      </div>
    </main>
  );
}

export function ContactPage() {
  const { addToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Order Inquiry');
  const [orderNumber, setOrderNumber] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch('/contact', {
        method: 'POST',
        body: JSON.stringify({ name, email, subject, orderNumber, message }),
      });
      addToast(res.message, 'success');
      setName('');
      setEmail('');
      setOrderNumber('');
      setMessage('');
    } catch (err) {
      addToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container" style={{ paddingTop: 40, paddingBottom: 64, maxWidth: 820 }}>
      <div className="font-mono" style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700 }}>
        DISPATCH & SUPPORT
      </div>
      <h1 className="font-display" style={{ margin: '6px 0 22px', fontSize: 'clamp(28px, 4vw, 42px)' }}>
        CONTACT PRO PACKS
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 28 }}>
        <form
          onSubmit={handleSubmit}
          style={{ background: 'var(--card)', border: '1px solid var(--fg)', padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <input required placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} className="pp-search-input" />
          <input required type="email" placeholder="Email Address" value={email} onChange={(e) => setEmail(e.target.value)} className="pp-search-input" />
          <select value={subject} onChange={(e) => setSubject(e.target.value)} className="pp-search-input">
            <option>Order Inquiry</option>
            <option>Bulk / Wholesale Quote</option>
            <option>Shipping & Tracking</option>
            <option>Product Question</option>
          </select>
          <input placeholder="Order # (Optional)" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} className="pp-search-input" />
          <textarea required rows={4} placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} className="pp-search-input" />
          <button type="submit" disabled={submitting} className="btn-primary">
            <Mail size={15} /> {submitting ? 'SENDING...' : 'SEND MESSAGE'}
          </button>
        </form>

        <div style={{ background: 'var(--bg-sky)', border: '1px solid var(--border)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 className="font-display" style={{ margin: 0, fontSize: 20 }}>
            LOS ANGELES HUB
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-muted)', lineHeight: 1.6 }}>
            Need help with a bulk tier order or tracking update? Send us a message and our dispatch
            team will respond within 2 hours during operating hours.
          </p>
          <div className="font-mono" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div><strong>HOURS:</strong> 9:00 AM – 8:30 PM PST Daily</div>
            <div><strong>EMAIL:</strong> support@propacks.club</div>
            <div><strong>LOCATION:</strong> Arts District, Los Angeles, CA</div>
          </div>
        </div>
      </div>
    </main>
  );
}
