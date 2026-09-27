import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

const features = [
  ['01', 'Flood Risk Intelligence', 'Identify high-risk areas and predicted water accumulation before streets become impassable.', 'cyan'],
  ['02', 'Flood Nowcasting', 'Analyse short-term rainfall intensity and translate it into local flood impact forecasts.', 'blue'],
  ['03', 'Risk Factor Analysis', 'Inspect contributing factors from terrain slope and surface runoff to drainage utilization.', 'violet'],
  ['04', 'Flood-Safe Routes', 'Direct emergency teams and municipal crews through low-exposure transit corridors.', 'green'],
  ['05', 'Emergency Response', 'Convert intelligence into priority alerts, pump station deployments, and field action.', 'red'],
  ['06', 'Municipal GIS Operations', 'Explore GIS layers including topographic elevation, drainage networks, and water depth.', 'orange'],
]
const pipeline = [
  ['01', 'Rainfall Observations', 'Observations + nowcasting inputs', '01'],
  ['02', 'Urban Surface Analysis', 'Terrain elevation + runoff accumulation', '02'],
  ['03', 'Drainage Capacity', 'Hydraulic load + capacity signals', '03'],
  ['04', 'Flood Risk Engine', 'Coupled hotspot depth estimation', '04'],
  ['05', 'Decision Support', 'Operational alerts, routes + action', '05'],
]
const metrics = [
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2c.4 1.8 1.2 3.1 2.4 4 .8.6 1.4 1.5 1.4 2.6A3.8 3.8 0 0 1 12 13.6 3.8 3.8 0 0 1 8.2 9.8c0-1.1.6-2 1.4-2.6 1.2-.9 2-2.2 2.4-4Z" /><path d="M7.2 14.8c1.4 1.2 3 1.9 4.8 1.9s3.4-.7 4.8-1.9c.6 2.2-.4 4.3-2.2 5.4-1.1.7-2.5.7-2.6.7s-1.5 0-2.6-.7c-1.8-1.1-2.8-3.2-2.2-5.4Z" /></svg>
    ),
    title: 'Operational',
    subtitle: 'Rainfall Nowcasts',
  },
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5 12 5l8 13.5H4Z" /><path d="M8.2 18.5 12 12.2l3.8 6.3" /></svg>
    ),
    title: 'Topographic',
    subtitle: 'DEM Elevation',
  },
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="7" r="2" /><circle cx="17.5" cy="7" r="2" /><circle cx="12" cy="17" r="2" /><path d="M8.3 8.2 10.8 15M15.7 8.2 13.2 15M8.6 7h6.8" /></svg>
    ),
    title: 'Hydraulic',
    subtitle: 'Drainage Network',
  },
  {
    icon: (
      <svg className="icon-stroke" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.2" /><path d="M12 8v4.2l2.6 1.6" /></svg>
    ),
    title: '0–3 Hour',
    subtitle: 'Forecast Horizon',
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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2.7c-3.6 4.5-7 8-7 11.3a7 7 0 0 0 14 0c0-3.3-3.4-6.8-7-11.3Z" /><path d="M12 18.5v-5M9.5 16l2.5-2.5L14.5 16" /></svg>
          </span>
          <span>
            <strong>JALDRISHTI</strong>
            <small>Urban Flood Intelligence &amp; Decision Support System</small>
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
          ENTER COMMAND CENTER
          <span>→</span>
        </Link>
      </header>

      <main>
        <section className="landing-hero" id="home">
          <img className="hero-photo" src="/mumbai-flood-hero.jpg" alt="Flooded Mumbai arterial road during monsoon, with traffic moving through standing water" />
          <div className="hero-veil" />

          <div className="hero-copy">
            <div className="hero-kicker">
              <span className="kicker-live"><i className="live-dot" /> DEMONSTRATION PROTOTYPE</span>
              <span className="kicker-sep" />
              <span>0–3 HOUR NOWCASTING</span>
              <span className="kicker-sep" />
              <span className="kicker-loc">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8a4.6 4.6 0 0 0-4.6 4.6c0 3.4 4.6 7.8 4.6 7.8s4.6-4.4 4.6-7.8A4.6 4.6 0 0 0 8 1.8Zm0 6.2A1.6 1.6 0 1 1 8 4.8a1.6 1.6 0 0 1 0 3.2Z" /></svg>
                Municipal Operations
              </span>
            </div>
            <h1>JALDRISHTI<br /><em style={{ fontSize: '0.55em', display: 'block', marginTop: '8px', fontWeight: 600 }}>URBAN FLOOD INTELLIGENCE &amp; DECISION SUPPORT SYSTEM</em></h1>
            <p style={{ fontSize: '1.2rem', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              &ldquo;Predict flood impact before it becomes an emergency.&rdquo;
            </p>
            <p>
              Coupling <strong>Rainfall</strong> + <strong>Terrain</strong> + <strong>Drainage</strong> to generate street-level flood intelligence and flood-safe routing across <strong>0–3 hour nowcasts</strong>.
            </p>
            <div className="hero-regions-strip">
              <span className="hero-regions-label">DEMONSTRATION REGIONS:</span>
              <span className="hero-region-chip">DELHI NCR</span>
              <span className="hero-region-chip">MUMBAI</span>
              <span className="hero-region-chip">CHENNAI</span>
            </div>
            <div className="hero-actions">
              <Link to="/dashboard" className="hero-primary">
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.2 8.2h8.1M8.4 5.2 11.8 8.2 8.4 11.2" /><path d="M13.4 4.2v7.6" /></svg>
                ENTER COMMAND CENTER
                <span>→</span>
              </Link>
              <a href="#how-it-works" className="hero-secondary">
                See How It Works
              </a>
            </div>
          </div>

          <aside className="risk-card" aria-label="Flood risk preview">
            <div className="risk-card-head">
              <strong>
                <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.8a4.6 4.6 0 0 0-4.6 4.6c0 3.4 4.6 7.8 4.6 7.8s4.6-4.4 4.6-7.8A4.6 4.6 0 0 0 8 1.8Zm0 6.2A1.6 1.6 0 1 1 8 4.8a1.6 1.6 0 0 1 0 3.2Z" /></svg>
                Municipal Operations Center
              </strong>
              <small>0–3h Horizon</small>
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
                <span><i className="c-vh" /> Critical</span>
                <span><i className="c-h" /> High</span>
                <span><i className="c-m" /> Moderate</span>
                <span><i className="c-l" /> Low</span>
              </div>
            </div>
            <div className="risk-card-foot">
              <span><i className="live-dot" /> Operational Nowcast Feed</span>
              <small>Simulated Input</small>
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
            <h2>Flooding is not<br /><em>just about rainfall volume.</em></h2>
            <p>Traditional weather forecasts inform authorities how much rain may fall, but cannot pinpoint where water will accumulate, which specific intersections will drown, or how emergency units should route around inundation.</p>
          </div>
          <div className="causal-chain">
            {[
              ['01', 'Rainfall'],
              ['02', 'Surface Runoff'],
              ['03', 'Surface Accumulation'],
              ['04', 'Drainage Loading'],
              ['05', 'Surcharge / Backflow'],
              ['06', 'Predicted Flood Depth']
            ].map(([step, label], index) => (
              <div key={label} className="causal-node">
                <span className="causal-step-num">{step}</span>
                <strong>{label}</strong>
                {index < 5 && <i>→</i>}
              </div>
            ))}
          </div>
          <div className="problem-callout">
            <span className="callout-tag">SYS</span>
            <strong>JalDrishti connects weather forecasting with urban terrain elevation and drainage network physics.</strong>
            <b>→</b>
          </div>
        </section>

        <section className="process-section" id="how-it-works">
          <div className="section-heading reveal">
            <div>
              <span className="section-kicker">FROM SIGNAL TO ACTION</span>
              <h2>How JalDrishti works.</h2>
            </div>
            <p>Coupled intelligence pipeline for municipal disaster operations.</p>
          </div>
          <div className="pipeline reveal">
            {pipeline.map((item, index) => (
              <button
                type="button"
                className={`pipeline-step ${activeStage === index ? 'active' : ''}`}
                key={item[0]}
                onClick={() => setActiveStage(index)}
              >
                <span className="pipeline-number">{item[0]}</span>
                <span className="pipeline-icon">{item[3]}</span>
                <strong>{item[1]}</strong>
                <small>{item[2]}</small>
                {index < pipeline.length - 1 && <i>→</i>}
              </button>
            ))}
          </div>
          <div className="pipeline-detail reveal">
            <div>
              <span className="detail-kicker">ACTIVE STAGE / {pipeline[activeStage][0]}</span>
              <h3>{pipeline[activeStage][1]}</h3>
              <p>{pipeline[activeStage][2]}. Evaluated against municipal drainage graphs and terrain slope data to project street-level water depth.</p>
            </div>
            <div className="detail-readout">
              <span>STAGE STATUS</span>
              <strong style={{ fontSize: '16px', color: '#38bdf8' }}>OPERATIONAL · VERIFIED</strong>
              <div><i style={{ width: '100%', background: '#38bdf8' }} /></div>
              <small>COUPLED ENGINE · PROTOTYPE DATA</small>
            </div>
          </div>
        </section>

        <section className="features-section" id="features">
          <div className="section-heading reveal">
            <div>
              <span className="section-kicker">OPERATIONAL CAPABILITIES</span>
              <h2>From risk detection to<br /><em>field intervention.</em></h2>
            </div>
            <p>Designed for municipal emergency control rooms and disaster management authorities.</p>
          </div>
          <div className="feature-grid reveal">
            {features.map(([icon, title, text, tone], index) => (
              <article className={`feature-card ${tone}`} key={title}>
                <span className="feature-icon">{icon}</span>
                <span className="feature-index">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <a href="#technology">View details <span>↗</span></a>
              </article>
            ))}
          </div>
        </section>

        <section className="compare-section reveal">
          <div className="compare-intro">
            <span className="section-kicker">OPERATIONAL PARADIGM SHIFT</span>
            <h2>Reactive response<br /><em>versus predictive intervention.</em></h2>
            <p>Transitioning municipal flood management from post-impact cleanup to pre-emptive mitigation.</p>
          </div>
          <div className="compare-columns">
            <div className="compare-column reactive">
              <span className="compare-tag">TRADITIONAL / REACTIVE</span>
              {['Rainfall Event', 'Water Accumulates', 'Traffic Disruptions', 'Emergency Response'].map((item, index) => (
                <div key={item}><strong>{item}</strong>{index < 3 && <i>↓</i>}</div>
              ))}
              <b>Action occurs after flood impact has escalated.</b>
            </div>
            <div className="compare-column proactive">
              <span className="compare-tag">JALDRISHTI / PREDICTIVE</span>
              {['Rainfall Nowcast', 'Coupled Terrain/Drain Analysis', '0–3h Depth Prediction', 'Pre-emptive Deployment'].map((item, index) => (
                <div key={item}><strong>{item}</strong>{index < 3 && <i>↓</i>}</div>
              ))}
              <b>Deployment occurs before streets reach critical depth.</b>
            </div>
          </div>
        </section>

        <section className="command-preview" id="technology">
          <div className="preview-copy reveal">
            <span className="section-kicker">THE COMMAND CENTER</span>
            <h2>One view of the<br /><em>whole situation.</em></h2>
            <p>See the city as a living system. Monitor flood status, critical zones, rainfall indicators, priority alerts and impact forecasts from one operational interface.</p>
            <div className="preview-points"><span>◉ Priority flood locations</span><span>◉ Critical zone monitoring</span><span>◉ Street-level impact forecast</span></div>
            <Link to="/dashboard" className="dark-button">ENTER COMMAND CENTER <span>→</span></Link>
          </div>
          <div className="dashboard-preview reveal">
            <div className="preview-top"><span><i className="live-dot" /> JALDRISHTI / COMMAND CENTER</span><b>DEMONSTRATION · MUMBAI</b></div>
            <div className="preview-alert"><span>OPERATIONAL ALERT</span><strong>CRITICAL ZONE DETECTED</strong><small>Predicted depth accumulation across low-lying corridors</small></div>
            <div className="preview-metrics"><span><b>61</b> mm/h rainfall</span><span><b>146.7</b> cm max depth</span><span><b>45</b> min to peak</span></div>
            <div className="preview-map"><div className="preview-radar" /><i /><i /><i /><span>DECISION SUPPORT SITUATION MAP</span></div>
            <div className="preview-footer"><span>3 Critical Zones</span><span>78% Drainage Load</span><span>2 Safe Corridors</span></div>
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
            <div className="arch-inputs"><span>Rainfall Input</span><b>+</b><span>Terrain / DEM Data</span><b>+</b><span>Drainage Network Graph</span></div>
            <div className="arch-arrow">↓</div>
            <div className="arch-core"><span>INTELLIGENCE LAYER</span><strong>Coupled Flood Intelligence Engine</strong><small>COUPLED HYDROLOGICAL · TERRAIN · NETWORK MODEL</small></div>
            <div className="arch-arrow">↓</div>
            <div className="arch-output"><span>Flood Risk Prediction</span><b>↓</b><span>JalDrishti Command Center</span><b>↓</b><strong>Alerts · Safe Routes · Emergency Response</strong></div>
          </div>
        </section>

        <section className="final-cta">
          <span className="section-kicker">0–3 HOUR FLOOD NOWCASTING</span>
          <h2>Urban flood intelligence &amp;<br /><em>decision support system.</em></h2>
          <p>Connecting rainfall, terrain, and drainage to protect city infrastructure.</p>
          <Link to="/dashboard" className="hero-primary">ENTER COMMAND CENTER <span>→</span></Link>
          <div className="landing-honesty-card">
            <strong>DEMONSTRATION DATA</strong>
            <p>Current rainfall input is demonstration / simulated data. Production deployment would ingest operational Doppler radar and automatic weather station (AWS) telemetry.</p>
          </div>
        </section>
      </main>
      <footer className="landing-footer"><span><b>JALDRISHTI</b> / Urban Flood Intelligence &amp; Decision Support System</span><span>Municipal GIS Decision Support · Demonstration Prototype</span></footer>
    </div>
  )
}

export default LandingPage
