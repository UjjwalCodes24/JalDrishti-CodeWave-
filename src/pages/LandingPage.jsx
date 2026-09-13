import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

const features = [
  ['⌖', 'Flood Risk Intelligence', 'Identify high-risk areas and predicted water accumulation before streets become impassable.', 'cyan'],
  ['◒', 'AI Nowcasting', 'Analyse short-term rainfall intensity and translate it into local flood impact forecasts.', 'blue'],
  ['◎', 'Explainable AI', 'See why a ward is at risk, from terrain and runoff to drainage overload.', 'violet'],
  ['⇢', 'Flood-Safe Routes', 'Direct emergency teams and commuters through safer, operational corridors.', 'green'],
  ['!', 'Emergency Response', 'Convert intelligence into priority alerts, resource deployment and field action.', 'red'],
  ['▦', 'Smart City Digital Twin', 'Explore a GIS-based model of urban systems, flood layers and street conditions.', 'orange'],
]
const pipeline = [
  ['01', 'Rainfall Intelligence', 'Observations + nowcasting inputs', '🌧'],
  ['02', 'Urban Surface Analysis', 'Terrain, elevation + runoff', '▦'],
  ['03', 'Drainage Intelligence', 'Capacity + overload signals', '≋'],
  ['04', 'AI Flood Risk Engine', 'Multi-factor hotspot detection', '◒'],
  ['05', 'Decision Support', 'Alerts, routes + recommendations', '⚠'],
]
const metrics = [
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c.4 1.8 1.2 3.1 2.4 4 .8.6 1.4 1.5 1.4 2.6A3.8 3.8 0 0 1 12 13.6 3.8 3.8 0 0 1 8.2 9.8c0-1.1.6-2 1.4-2.6 1.2-.9 2-2.2 2.4-4Z" /><path d="M7.2 14.8c1.4 1.2 3 1.9 4.8 1.9s3.4-.7 4.8-1.9c.6 2.2-.4 4.3-2.2 5.4-1.1.7-2.5.7-2.6.7s-1.5 0-2.6-.7c-1.8-1.1-2.8-3.2-2.2-5.4Z" /></svg>
    ),
    title: 'Real-time',
    subtitle: 'Rainfall Nowcasts',
  },
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5 12 5l8 13.5H4Z" /><path d="M8.2 18.5 12 12.2l3.8 6.3" /></svg>
    ),
    title: 'High-resolution',
    subtitle: 'DEM',
  },
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="7" r="2" /><circle cx="17.5" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><path d="M8.3 8.2 10.8 15M15.7 8.2 13.2 15M8.6 7h6.8" /></svg>
    ),
    title: 'Graph-based',
    subtitle: 'Drainage Model',
  },
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" /><path d="M12 8v4.2l2.6 1.6" /></svg>
    ),
    title: '0–3 Hour',
    subtitle: 'Lead Time',
  },
]

function LandingPage() {
  const [activeStage, setActiveStage] = useState(3)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible')), { threshold: 0.08, rootMargin: '120px 0px 0px 0px' })
    document.querySelectorAll('.landing .reveal').forEach((element) => observer.observe(element))
    const revealHash = () => {
      const id = window.location.hash.slice(1)
      if (!id) return
      document.getElementById(id)?.querySelectorAll('.reveal').forEach((element) => element.classList.add('is-visible'))
    }
    revealHash()
    window.addEventListener('hashchange', revealHash)
    return () => {
      observer.disconnect()
      window.removeEventListener('hashchange', revealHash)
    }
  }, [])

  return (
    <div className="landing">
      <header className={`landing-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <Link to="/" className="landing-brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32"><path d="M16 3.2c.6 3.2 2.1 5.6 4.4 7.2 1.6 1.1 2.6 2.8 2.6 4.8A7 7 0 0 1 16 22.2 7 7 0 0 1 9 15.2c0-2 1-3.7 2.6-4.8C13.9 8.8 15.4 6.4 16 3.2Z" /><path d="M10.4 22.8c2 1.7 4.2 2.6 5.6 2.6s3.6-.9 5.6-2.6c.8 2.6-.6 5-2.8 6.3-1.3.8-2.8.8-2.8.8s-1.5 0-2.8-.8c-2.2-1.3-3.6-3.7-2.8-6.3Z" /></svg>
          </span>
          <span>
            <strong>JalDrishti</strong>
            <small>Urban Flood Intelligence System</small>
          </span>
        </Link>
        <nav className="landing-links" aria-label="Landing page navigation">
          <a href="#home" className="is-active">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#technology">Technology</a>
          <a href="#about">About</a>
        </nav>
        <Link to="/dashboard" className="landing-nav-cta">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.2 8.2h8.1M8.4 5.2 11.8 8.2 8.4 11.2" /><path d="M13.4 4.2v7.6" /></svg>
          Launch Command Center
          <span>→</span>
        </Link>
      </header>

      <main>
        <section className="landing-hero" id="home">
          <img className="hero-photo" src="/mumbai-flood-hero.jpg" alt="Flooded Mumbai arterial road during monsoon, with traffic moving through standing water" />
          <div className="hero-veil" />

          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="kicker-live"><i className="live-dot" /> Live</span>
              <span className="kicker-sep" />
              <span>Real-time Rainfall + Drainage + Topography</span>
              <span className="kicker-sep" />
              <span className="kicker-loc">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8a4.6 4.6 0 0 0-4.6 4.6c0 3.4 4.6 7.8 4.6 7.8s4.6-4.4 4.6-7.8A4.6 4.6 0 0 0 8 1.8Zm0 6.2A1.6 1.6 0 1 1 8 4.8a1.6 1.6 0 0 1 0 3.2Z" /></svg>
                Ministry of Earth Sciences
              </span>
            </div>
            <h1>See the flood<br /><em>before it happens.</em></h1>
            <p>
              JalDrishti fuses real-time rainfall nowcasts, high-resolution terrain data
              and a graph-based drainage model to predict street-level inundation
              in urban areas — within <b>0–3 hours</b>.
            </p>
            <div className="hero-actions">
              <Link to="/dashboard" className="hero-primary">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.2 8.2h8.1M8.4 5.2 11.8 8.2 8.4 11.2" /><path d="M13.4 4.2v7.6" /></svg>
                Launch Command Center
                <span>→</span>
              </Link>
              <a href="#how-it-works" className="hero-secondary">
                <span className="play-icon">▶</span>
                See how it works
              </a>
            </div>
          </div>

          <aside className="risk-card" aria-label="Mumbai flood risk preview">
            <div className="risk-card-head">
              <strong>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8a4.6 4.6 0 0 0-4.6 4.6c0 3.4 4.6 7.8 4.6 7.8s4.6-4.4 4.6-7.8A4.6 4.6 0 0 0 8 1.8Zm0 6.2A1.6 1.6 0 1 1 8 4.8a1.6 1.6 0 0 1 0 3.2Z" /></svg>
                Ministry of Earth Sciences
              </strong>
              <small>Next 3 Hours</small>
            </div>
            <div className="risk-card-body">
              <div className="risk-map">
                <svg className="risk-shape" viewBox="0 0 180 210" aria-hidden="true">
                  <defs>
                    <radialGradient id="heatCore" cx="46%" cy="58%" r="58%">
                      <stop offset="0%" stopColor="#ef4444" />
                      <stop offset="28%" stopColor="#f97316" />
                      <stop offset="52%" stopColor="#eab308" />
                      <stop offset="78%" stopColor="#22c55e" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </radialGradient>
                  </defs>
                  <path fill="url(#heatCore)" d="M92 10c18 6 34 18 42 38 8 18 6 32-2 46 10 8 22 18 24 34 3 20-8 38-28 48-14 8-24 22-26 36-18-4-34-8-48-22-16-16-22-36-18-56-12-8-22-22-20-38 2-18 18-30 36-34 6-16 22-28 40-52Z" />
                </svg>
                <span className="risk-pin">
                  <i />
                  High Risk
                </span>
                <small className="risk-place">Bandra-Kurla</small>
              </div>
              <div className="risk-legend">
                <p>Flood Risk</p>
                <span><i className="c-vh" /> Very High</span>
                <span><i className="c-h" /> High</span>
                <span><i className="c-m" /> Medium</span>
                <span><i className="c-l" /> Low</span>
              </div>
            </div>
            <div className="risk-card-foot">
              <span><i className="live-dot" /> Rainfall nowcasting active</span>
              <small>Last updated: 10:42 AM</small>
            </div>
          </aside>

          <div className="hero-metrics">
            {metrics.map((item) => (
              <div className="metric" key={item.subtitle}>
                {item.icon}
                <span>
                  <b>{item.title}</b>
                  {item.subtitle}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="problem-section reveal" id="about">
          <div className="section-intro">
            <span className="section-kicker">THE URBAN FLOOD PROBLEM</span>
            <h2>Flooding is not<br /><em>just about rain.</em></h2>
            <p>Traditional weather forecasts can tell authorities how much rain may fall. They cannot always tell them exactly where that rainfall will accumulate, which streets may flood, or what action should be taken.</p>
          </div>
          <div className="causal-chain">{[['🌧️', 'Rainfall'], ['💧', 'Urban Surface Runoff'], ['⛰️', 'Terrain & Elevation'], ['🌀', 'Drainage Capacity'], ['🌊', 'Street-Level Flooding']].map(([icon, label], index) => <div key={label} className="causal-node"><span>{icon}</span><strong>{label}</strong>{index < 4 && <i>↓</i>}</div>)}</div>
          <div className="problem-callout"><span>JD</span><strong>JalDrishti connects weather intelligence<br />with urban infrastructure intelligence.</strong><b>→</b></div>
        </section>

        <section className="process-section" id="how-it-works">
          <div className="section-heading reveal">
            <div>
              <span className="section-kicker">FROM SIGNAL TO DECISION</span>
              <h2>How JalDrishti works.</h2>
            </div>
            <p>One connected intelligence layer for the entire urban flood response.</p>
          </div>
          <div className="pipeline reveal">{pipeline.map((item, index) => <button type="button" className={`pipeline-step ${activeStage === index ? 'active' : ''}`} key={item[0]} onClick={() => setActiveStage(index)}><span className="pipeline-number">{item[0]}</span><span className="pipeline-icon">{item[3]}</span><strong>{item[1]}</strong><small>{item[2]}</small>{index < pipeline.length - 1 && <i>→</i>}</button>)}</div>
          <div className="pipeline-detail reveal">
            <div>
              <span className="detail-kicker">ACTIVE INTELLIGENCE LAYER / {pipeline[activeStage][0]}</span>
              <h3>{pipeline[activeStage][1]}</h3>
              <p>{pipeline[activeStage][2]}. The engine continuously updates this signal as new observations arrive, keeping the command center one step ahead of the street.</p>
            </div>
            <div className="detail-readout">
              <span>MODEL CONFIDENCE</span>
              <strong>{[94, 89, 86, 91, 97][activeStage]}%</strong>
              <div><i style={{ width: `${[94, 89, 86, 91, 97][activeStage]}%` }} /></div>
              <small>UPDATED 14:20 IST · STREAMING</small>
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-heading reveal">
            <div>
              <span className="section-kicker">A COMPLETE DECISION SYSTEM</span>
              <h2>From flood risk to<br /><em>field action.</em></h2>
            </div>
            <p>Built for municipal command rooms, emergency teams and the people they protect.</p>
          </div>
          <div className="feature-grid reveal">{features.map(([icon, title, text, tone], index) => <article className={`feature-card ${tone}`} key={title}><span className="feature-icon">{icon}</span><span className="feature-index">0{index + 1}</span><h3>{title}</h3><p>{text}</p><a href="#technology">Explore capability <span>↗</span></a></article>)}</div>
        </section>

        <section className="compare-section reveal">
          <div className="compare-intro">
            <span className="section-kicker">A CHANGE IN OPERATING MODEL</span>
            <h2>Reactive cities<br /><em>wait. Intelligent cities act.</em></h2>
            <p>JalDrishti shifts the operating model from response after impact to preparation before it.</p>
          </div>
          <div className="compare-columns">
            <div className="compare-column reactive"><span className="compare-tag">✕ TRADITIONAL / REACTIVE</span>{['🌧 Rainfall', '🌊 Flood occurs', '🚗 Traffic disruption', '🚨 Emergency response'].map((item, index) => <div key={item}><strong>{item}</strong>{index < 3 && <i>↓</i>}</div>)}<b>Action happens after the crisis.</b></div>
            <div className="compare-column proactive"><span className="compare-tag">✓ JALDRISHTI / PROACTIVE</span>{['🌧 Rainfall Intelligence', '◒ Risk Prediction', '⚠ Early Warning', '🚑 Resource Preparation', '🚧 Preventive Action'].map((item, index) => <div key={item}><strong>{item}</strong>{index < 4 && <i>↓</i>}</div>)}<b>Action begins before the situation becomes critical.</b></div>
          </div>
        </section>

        <section className="command-preview" id="technology">
          <div className="preview-copy reveal">
            <span className="section-kicker">THE COMMAND CENTER</span>
            <h2>One view of the<br /><em>whole situation.</em></h2>
            <p>See the city as a living system. Monitor flood status, critical zones, rainfall indicators, priority alerts and impact forecasts from one operational interface.</p>
            <div className="preview-points"><span>◉ Live flood status</span><span>◉ Critical zone ranking</span><span>◉ Street-level impact forecast</span></div>
            <Link to="/dashboard" className="dark-button">Enter the Command Center <span>→</span></Link>
          </div>
          <div className="dashboard-preview reveal">
            <div className="preview-top"><span><i className="live-dot" /> JALDRISHTI / COMMAND CENTER</span><b>LIVE · MUMBAI</b></div>
            <div className="preview-alert"><span>🔴 CURRENT STATUS</span><strong>CRITICAL ALERT</strong><small>Rainfall intensity rising across Mithi Basin</small></div>
            <div className="preview-metrics"><span><b>61</b> mm/h rainfall</span><span><b>87</b> risk score</span><span><b>45</b> min to impact</span></div>
            <div className="preview-map"><div className="preview-radar" /><i /><i /><i /><span>LIVE FLOOD SITUATION MAP</span></div>
            <div className="preview-footer"><span>▰ 3 Critical zones</span><span>≋ 78% Drainage load</span><span>→ 2 Safe corridors</span></div>
          </div>
        </section>

        <section className="architecture-section reveal">
          <div className="section-heading">
            <div>
              <span className="section-kicker">UNDER THE SURFACE</span>
              <h2>Built for urban<br /><em>flood intelligence.</em></h2>
            </div>
            <p>A connected architecture that turns fragmented city data into decisions people can act on.</p>
          </div>
          <div className="architecture">
            <div className="arch-inputs"><span>Rainfall & Weather Data</span><b>+</b><span>Terrain / DEM Data</span><b>+</b><span>Drainage Network Data</span></div>
            <div className="arch-arrow">↓</div>
            <div className="arch-core"><span>INTELLIGENCE LAYER</span><strong>AI & Flood Intelligence Engine</strong><small>COUPLED HYDROLOGICAL · TERRAIN · NETWORK MODEL</small></div>
            <div className="arch-arrow">↓</div>
            <div className="arch-output"><span>Flood Risk Prediction</span><b>↓</b><span>JalDrishti Command Center</span><b>↓</b><strong>Alerts · Safe Routes · Emergency Response</strong></div>
          </div>
        </section>

        <section className="final-cta">
          <div className="cta-orbit" />
          <span className="section-kicker">THE NEXT RAINFALL EVENT IS ALREADY A DATASET</span>
          <h2>Don’t wait for the<br /><em>flood to happen.</em></h2>
          <p>Predict. Prepare. Protect.</p>
          <Link to="/dashboard" className="hero-primary">Launch JalDrishti Command Center <span>→</span></Link>
          <small>URBAN FLOOD INTELLIGENCE SYSTEM · MINISTRY OF EARTH SCIENCES</small>
        </section>
      </main>
      <footer className="landing-footer"><span><b>JalDrishti</b> / Urban Flood Intelligence System</span><span>Built for resilient Indian cities <i>•</i> 2026</span></footer>
    </div>
  )
}

export default LandingPage
