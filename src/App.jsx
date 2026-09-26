import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://seonbaeon-backend-1.onrender.com/api";
const FAVORITES_KEY = "seonbaeon-favorites";
const USER_KEY = "seonbaeon-logged-user";

const ENGLISH_CATEGORIES = [
  "All",
  "Kids English",
  "Speaking",
  "Reading & Writing",
  "Grammar",
  "Storytelling",
  "School English",
];

async function readResponse(response) {
  const text = await response.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message =
      data?.message ||
      (typeof data === "string" ? data : "Something went wrong.");
    throw new Error(message);
  }

  return data;
}

/* =========================
   AUTH PAGE
========================= */

function AuthPage({ mode, setMode, onLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all required fields.");
      return;
    }

    if (mode === "signup" && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      const endpoint = mode === "signup" ? "/users/signup" : "/users/login";
      const body =
        mode === "signup"
          ? { name: name.trim(), email: email.trim(), password }
          : { email: email.trim(), password };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await readResponse(response);

      if (mode === "signup") {
        alert("Account created successfully! Please log in.");
        setMode("login");
        setName("");
        setPassword("");
      } else {
        onLogin(data);
      }
    } catch (err) {
      setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <div className="auth-logo">SeonbaeON<span>.</span></div>
          <h1>{mode === "login" ? "Welcome Back" : "Create Your Account"}</h1>
          <p>
            {mode === "login"
              ? "Login to continue your teacher discovery journey."
              : "Join SeonbaeON and find the right English teacher for your child."}
          </p>
        </div>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <>
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </>
          )}

          <label>Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button className="auth-submit" type="submit" disabled={loading}>
            {loading
              ? "Please wait..."
              : mode === "login"
                ? "Login →"
                : "Create Account →"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button type="button" onClick={() => setMode("signup")}>
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("login")}>
                Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================
   HOME PAGE
========================= */

function HomePage({ goToTeachers }) {
  return (
    <>
      <section className="hero-section" id="home">
        <div className="hero-content">
          <p className="small-title">FIND THE RIGHT ENGLISH TEACHER</p>
          <h1>
            Know your teacher
            <br />
            <span>before you join.</span>
          </h1>
          <p className="hero-text">
            Discover English teachers for Korean children, explore qualifications,
            read reviews, and watch sample demo lessons before choosing.
          </p>

          <div className="hero-buttons">
            <button className="primary-btn" onClick={goToTeachers}>
              Find a Teacher →
            </button>
            <button
              className="secondary-btn"
              onClick={() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" })}
            >
              How It Works
            </button>
          </div>

          <div className="trust-info">
            <div><strong>Profile</strong><span>Know your teacher</span></div>
            <div><strong>Reviews</strong><span>Hear from students</span></div>
            <div><strong>Demo</strong><span>See the teaching style</span></div>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-top">
            <span className="online">● Available</span>
            <span>★ 4.9</span>
          </div>
          <div className="mentor-avatar">👩🏻‍🏫</div>
          <h2>English Teacher</h2>
          <p className="mentor-subtitle">Kids English & Phonics</p>
          <div className="mentor-details">
            <div><strong>8+</strong><span>Years Experience</span></div>
            <div><strong>250+</strong><span>Students</span></div>
            <div><strong>98%</strong><span>Positive Reviews</span></div>
          </div>
          <button className="view-profile" onClick={goToTeachers}>View Teacher Profile</button>
        </div>
      </section>

      <section className="search-section">
        <p className="small-title">START YOUR SEARCH</p>
        <h2>Find an English teacher that fits you.</h2>
        <div className="search-box">
          <select defaultValue="English" disabled>
            <option value="English">English</option>
          </select>
          <select defaultValue="All">
            <option value="All">Select Location</option>
            <option value="Busan">Busan</option>
            <option value="Seoul">Seoul</option>
            <option value="Daegu">Daegu</option>
          </select>
          <button onClick={goToTeachers}>Search Teachers 🔍</button>
        </div>
      </section>

      <section className="how-section" id="how">
        <p className="small-title">HOW SEONBAEON WORKS</p>
        <h2>
          Make a better decision
          <br />
          <span>before you commit.</span>
        </h2>
        <div className="steps">
          <div className="step"><div className="step-number">01</div><h3>Find</h3><p>Search English teachers based on location and learning needs.</p></div>
          <div className="step"><div className="step-number">02</div><h3>Watch</h3><p>Watch a sample demo lesson and understand the teaching style.</p></div>
          <div className="step"><div className="step-number">03</div><h3>Trust</h3><p>Check qualifications and read reviews from previous students.</p></div>
          <div className="step"><div className="step-number">04</div><h3>Choose</h3><p>Compare English teachers and choose with more confidence.</p></div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Don't choose a class blindly.</h2>
        <p>See the teacher. Feel the style. Choose with confidence.</p>
        <button className="primary-btn" onClick={goToTeachers}>Explore English Teachers →</button>
      </section>

      <footer>
        <div className="logo">SeonbaeON<span>.</span></div>
        <p>Know the teacher before joining the class.</p>
        <p className="copyright">© 2026 SeonbaeON. All rights reserved.</p>
      </footer>
    </>
  );
}

/* =========================
   TEACHER SEARCH
========================= */

function TeacherSearch({ goHome, openProfile }) {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("All");
  const [location, setLocation] = useState("All");
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const [compareTeachers, setCompareTeachers] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  useEffect(() => {
    async function loadTeachers() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch(`${API_URL}/teachers`);
        const data = await readResponse(response);
        setTeachers(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || "Could not connect to the backend.");
      } finally {
        setLoading(false);
      }
    }
    loadTeachers();
  }, []);

  useEffect(() => {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const filteredTeachers = useMemo(() => {
    const text = search.trim().toLowerCase();
    return teachers.filter((teacher) => {
      const categoryMatch =
        category === "All" ||
        (category === "Favorites" ? favorites.includes(teacher.id) : teacher.category === category);
      const locationMatch = location === "All" || teacher.location === location;
      const searchMatch = !text || [
        teacher.name,
        teacher.category,
        teacher.specialty,
        teacher.location,
        teacher.teachingStyle,
      ].some((value) => String(value || "").toLowerCase().includes(text));
      return categoryMatch && locationMatch && searchMatch;
    });
  }, [teachers, category, location, search, favorites]);

  function toggleFavorite(id) {
    setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleCompare(teacher) {
    setCompareTeachers((current) => {
      if (current.some((item) => item.id === teacher.id)) {
        return current.filter((item) => item.id !== teacher.id);
      }
      if (current.length >= 2) {
        alert("You can compare up to 2 English teachers.");
        return current;
      }
      return [...current, teacher];
    });
  }

  return (
    <div className="teachers-page">
      <div className="teachers-header">
        <button className="back-home" onClick={goHome}>← Back to Home</button>
        <div>
          <p className="small-title">FIND YOUR ENGLISH TEACHER</p>
          <h1>Find the right English teacher for you.</h1>
          <p>Explore English teachers, compare their experience, teaching style and reviews.</p>
        </div>
      </div>

      <div className="teacher-search-area">
        <div className="search-top">
          <div className="search-input-wrapper">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search teacher, category or specialty..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="All">All English Categories</option>
            {ENGLISH_CATEGORIES.slice(1).map((item) => <option key={item} value={item}>{item}</option>)}
            <option value="Favorites">My Favorites</option>
          </select>
          <select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="All">All Locations</option>
            <option value="Busan">Busan</option>
            <option value="Seoul">Seoul</option>
            <option value="Daegu">Daegu</option>
          </select>
        </div>

        <div className="results-header">
          <strong>{filteredTeachers.length} English teachers found</strong>
          <span>English teachers for Korean children</span>
        </div>

        {loading && <div className="no-results"><div>⏳</div><h2>Loading teachers...</h2><p>Getting English teachers from the SeonbaeON database.</p></div>}

        {error && !loading && <div className="no-results"><div>⚠️</div><h2>Backend connection problem</h2><p>{error}</p><p>Make sure Spring Boot is running on port 8080.</p></div>}

        {!loading && !error && compareTeachers.length > 0 && (
          <div className="compare-bar">
            <div className="compare-title">
              <strong>Compare English Teachers</strong>
              <span>{compareTeachers.length} teacher{compareTeachers.length > 1 ? "s" : ""} selected</span>
            </div>
            <div className="compare-selected">
              {compareTeachers.map((teacher) => (
                <div className="compare-mini-card" key={teacher.id}>
                  <span>{teacher.emoji}</span>
                  <strong>{teacher.name}</strong>
                  <button onClick={() => toggleCompare(teacher)}>×</button>
                </div>
              ))}
            </div>
            <button className="compare-now-btn" disabled={compareTeachers.length < 2} onClick={() => setShowCompare(true)}>
              Compare Now →
            </button>
          </div>
        )}

        {!loading && !error && filteredTeachers.length > 0 && (
          <div className="teacher-grid">
            {filteredTeachers.map((teacher) => (
              <div className="teacher-card" key={teacher.id}>
                <button className={`favorite-btn ${favorites.includes(teacher.id) ? "favorite-active" : ""}`} onClick={() => toggleFavorite(teacher.id)}>
                  {favorites.includes(teacher.id) ? "♥" : "♡"}
                </button>
                <div className="teacher-card-top">
                  <div className="teacher-avatar">{teacher.emoji}</div>
                  <div className="rating">★ {teacher.rating}</div>
                </div>
                <h2>{teacher.name}</h2>
                <p className="teacher-specialty">{teacher.specialty}</p>
                <div className="teacher-tags">
                  <span>{teacher.category}</span>
                  <span>{teacher.location}</span>
                  <span>{teacher.teachingStyle}</span>
                </div>
                <div className="teacher-stats">
                  <div><strong>{teacher.experience}</strong><small>Experience</small></div>
                  <div><strong>{teacher.studentCount}+</strong><small>Students</small></div>
                  <div><strong>{teacher.reviewCount}</strong><small>Reviews</small></div>
                </div>
                <div className="teacher-actions">
                  <button className="profile-btn" onClick={() => openProfile(teacher)}>View Profile</button>
                  <button className="compare-btn" onClick={() => toggleCompare(teacher)}>
                    {compareTeachers.some((item) => item.id === teacher.id) ? "Added ✓" : "Compare"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredTeachers.length === 0 && (
          <div className="no-results"><div>🔎</div><h2>No English teachers found</h2><p>Try changing your search or filters.</p></div>
        )}

        {showCompare && compareTeachers.length === 2 && (
          <CompareModal teachers={compareTeachers} onClose={() => setShowCompare(false)} />
        )}
      </div>
    </div>
  );
}

function CompareModal({ teachers, onClose }) {
  return (
    <div className="compare-overlay">
      <div className="compare-modal">
        <button className="compare-close" onClick={onClose}>×</button>
        <p className="small-title">ENGLISH TEACHER COMPARISON</p>
        <h2>Compare Teachers</h2>
        <p className="compare-subtitle">See the differences side by side before making your decision.</p>
        <div className="comparison-table">
          <div className="comparison-row comparison-header">
            <div>Feature</div>
            {teachers.map((teacher) => (
              <div key={teacher.id} className="comparison-teacher">
                <div className="comparison-avatar">{teacher.emoji}</div>
                <strong>{teacher.name}</strong>
                <span>★ {teacher.rating}</span>
              </div>
            ))}
          </div>
          {[
            ["Category", "category"],
            ["Specialty", "specialty"],
            ["Location", "location"],
            ["Experience", "experience"],
            ["Students", "studentCount"],
            ["Teaching Style", "teachingStyle"],
            ["Reviews", "reviewCount"],
          ].map(([label, key]) => (
            <div className="comparison-row" key={key}>
              <div>{label}</div>
              {teachers.map((teacher) => (
                <div key={teacher.id}>{key === "studentCount" ? `${teacher[key]}+` : teacher[key]}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* =========================
   TEACHER PROFILE
========================= */

function TeacherProfile({ teacher, goBack, currentUser }) {
  const [showConsultation, setShowConsultation] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewError, setReviewError] = useState("");
  const [reviewName, setReviewName] = useState(currentUser?.name || "");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [consultSubmitting, setConsultSubmitting] = useState(false);
  const [consultMessage, setConsultMessage] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!teacher) return;
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      setIsFavorite(saved.includes(teacher.id));
    } catch {
      setIsFavorite(false);
    }
  }, [teacher]);

  useEffect(() => {
    if (!teacher) return;
    async function loadReviews() {
      try {
        setReviewLoading(true);
        const response = await fetch(`${API_URL}/teachers/${teacher.id}/reviews`);
        const data = await readResponse(response);
        setReviews(Array.isArray(data) ? data : []);
      } catch (err) {
        setReviewError(err.message || "Could not load reviews.");
      } finally {
        setReviewLoading(false);
      }
    }
    loadReviews();
  }, [teacher]);

  if (!teacher) {
    return <div className="no-results"><h2>No teacher selected.</h2><button className="primary-btn" onClick={goBack}>Back to Teachers</button></div>;
  }

  function toggleProfileFavorite() {
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); } catch { saved = []; }
    const next = saved.includes(teacher.id) ? saved.filter((id) => id !== teacher.id) : [...saved, teacher.id];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    setIsFavorite(next.includes(teacher.id));
  }

  async function submitConsultation(e) {
    e.preventDefault();
    setConsultSubmitting(true);
    setConsultMessage("");
    const formElement = e.currentTarget;
    const form = new FormData(formElement);
    const body = {
      teacherId: teacher.id,
      studentName: String(form.get("studentName") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      preferredDate: String(form.get("preferredDate") || ""),
      preferredTime: String(form.get("preferredTime") || ""),
      message: String(form.get("message") || "").trim(),
    };

    try {
      const response = await fetch(`${API_URL}/consultations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readResponse(response);
      alert(data.message || "Consultation request sent successfully!");
      setShowConsultation(false);
      formElement.reset();
    } catch (err) {
      setConsultMessage(err.message || "Could not send the consultation request.");
    } finally {
      setConsultSubmitting(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!reviewName.trim() || !reviewText.trim()) return;
    setReviewSubmitting(true);
    setReviewError("");

    try {
      const response = await fetch(`${API_URL}/teachers/${teacher.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName: reviewName.trim(),
          rating: Number(reviewRating),
          text: reviewText.trim(),
        }),
      });
      const saved = await readResponse(response);
      setReviews((current) => [saved, ...current]);
      setReviewText("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(err.message || "Could not submit the review.");
    } finally {
      setReviewSubmitting(false);
    }
  }

  return (
    <div className="profile-page">
      <div className="profile-container">
        {showConsultation && (
          <div className="consultation-overlay">
            <div className="consultation-modal">
              <button className="close-consultation" onClick={() => setShowConsultation(false)}>×</button>
              <h2>Request Consultation</h2>
              <p>Send a consultation request to {teacher.name}.</p>
              {consultMessage && <div className="form-error">{consultMessage}</div>}
              <form onSubmit={submitConsultation}>
                <label>Student Name</label>
                <input name="studentName" type="text" placeholder="Enter your name" defaultValue={currentUser?.name || ""} required />
                <label>Email</label>
                <input name="email" type="email" placeholder="Enter your email" defaultValue={currentUser?.email || ""} required />
                <label>Phone</label>
                <input name="phone" type="tel" placeholder="Enter your phone number" />
                <label>Preferred Date</label>
                <input name="preferredDate" type="date" required />
                <label>Preferred Time</label>
                <input name="preferredTime" type="time" required />
                <label>Message</label>
                <textarea name="message" placeholder="Tell the teacher what you would like to discuss..." rows="4" />
                <button type="submit" className="submit-consultation" disabled={consultSubmitting}>
                  {consultSubmitting ? "Sending..." : "Send Request"}
                </button>
              </form>
            </div>
          </div>
        )}

        <button className="back-home" onClick={goBack}>← Back to Teachers</button>

        <div className="profile-header">
          <div className="profile-avatar">{teacher.emoji}</div>
          <div className="profile-main-info">
            <div className="profile-name-row">
              <div>
                <h1>{teacher.name}</h1>
                <p>{teacher.specialty}</p>
              </div>
              <button className="profile-favorite" onClick={toggleProfileFavorite}>
                {isFavorite ? "♥" : "♡"}
              </button>
            </div>
            <div className="profile-rating">★ {teacher.rating}<span>({teacher.reviewCount} reviews)</span></div>
            <div className="profile-tags">
              <span>📚 English — {teacher.category}</span>
              <span>📍 {teacher.location}</span>
              <span>{teacher.available ? "● Available" : "● Not Available"}</span>
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="profile-left">
            <section className="profile-section">
              <h2>About the Teacher</h2>
              <p>{teacher.bio}</p>
            </section>

            <section className="profile-section">
              <h2>Qualifications & Experience</h2>
              <div className="qualification-list">
                <div className="qualification-item"><span>🎓</span><div><strong>Teaching Qualification</strong><p>{teacher.qualification}</p></div></div>
                <div className="qualification-item"><span>💼</span><div><strong>{teacher.experience} Experience</strong><p>Experienced in English teaching.</p></div></div>
                <div className="qualification-item"><span>👨‍🎓</span><div><strong>{teacher.studentCount}+ Students</strong><p>Students taught through previous English classes.</p></div></div>
              </div>
            </section>

            <section className="profile-section">
              <h2>Teaching Style</h2>
              <div className="style-card">
                <div className="style-icon">🗣️</div>
                <div><h3>{teacher.teachingStyle}</h3><p>This English teacher's approach is designed to make lessons easier to understand and engaging for learners.</p></div>
              </div>
            </section>

            <section className="profile-section">
              <div className="section-title-row">
                <div><h2>Demo Class</h2><p>See the sample lesson before choosing.</p></div>
              </div>
              <div className="demo-video">
                <div className="demo-play-area">
                  {teacher.demoVideoType === "youtube" && teacher.demoVideoUrl ? (
                    <iframe
                      className="demo-video-player"
                      src={`https://www.youtube.com/embed/${teacher.demoVideoUrl}`}
                      title={`Sample English Demo for ${teacher.name}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  ) : teacher.demoVideoUrl ? (
                    <video className="demo-video-player" controls>
                      <source src={teacher.demoVideoUrl} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  ) : (
                    <p>No demo video is available yet.</p>
                  )}
                </div>
                <h3>Watch Sample English Demo</h3>
                <p>This is a public sample English-learning video, not a recording of this fictional profile.</p>
                <button className="watch-demo-btn" onClick={() => document.querySelector(".demo-video-player")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Watch Demo Class →</button>
              </div>
            </section>

            <section className="profile-section">
              <div className="section-title-row">
                <div><h2>Student Reviews</h2><p>Real reviews are stored in the SeonbaeON database.</p></div>
                <div className="review-summary">★ {teacher.rating}</div>
              </div>

              {reviewLoading && <div className="review-card"><p>Loading reviews...</p></div>}
              {!reviewLoading && reviewError && <div className="form-error">{reviewError}</div>}
              {!reviewLoading && !reviewError && reviews.length === 0 && <div className="review-card"><p>No reviews yet.</p></div>}

              {!reviewLoading && reviews.map((review) => (
                <div className="review-card" key={review.id}>
                  <div className="review-top"><strong>{review.studentName}</strong><span>★ {review.rating}</span></div>
                  <p>{review.text}</p>
                  <small>{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</small>
                </div>
              ))}

              <div className="review-form-card">
                <h3>Write a Review</h3>
                <form onSubmit={submitReview}>
                  <input value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="Your name" required />
                  <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))}>
                    <option value="5">★★★★★ 5</option>
                    <option value="4">★★★★☆ 4</option>
                    <option value="3">★★★☆☆ 3</option>
                    <option value="2">★★☆☆☆ 2</option>
                    <option value="1">★☆☆☆☆ 1</option>
                  </select>
                  <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows="4" placeholder="Share your experience..." required />
                  <button className="submit-consultation" type="submit" disabled={reviewSubmitting}>{reviewSubmitting ? "Submitting..." : "Submit Review"}</button>
                </form>
              </div>
            </section>
          </div>

          <aside className="profile-sidebar">
            <div className="booking-card">
              <h2>Interested in this teacher?</h2>
              <p>Contact the teacher before making your final decision.</p>
              <button className="consultation-btn" onClick={() => setShowConsultation(true)}>Request Consultation</button>
              <button className="compare-profile-btn" onClick={goBack}>⚖ Compare Teacher</button>
            </div>

            <div className="quick-info">
              <h3>Quick Information</h3>
              <div><span>Subject</span><strong>English</strong></div>
              <div><span>Category</span><strong>{teacher.category}</strong></div>
              <div><span>Location</span><strong>{teacher.location}</strong></div>
              <div><span>Experience</span><strong>{teacher.experience}</strong></div>
              <div><span>Students</span><strong>{teacher.studentCount}+</strong></div>
              <div><span>Reviews</span><strong>{teacher.reviewCount}</strong></div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN APP
========================= */

function App() {
  const [page, setPage] = useState("home");
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [authMode, setAuthMode] = useState("login");
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || "null");
    } catch {
      return null;
    }
  });

  function openLogin() { setAuthMode("login"); setPage("auth"); }
  function openSignup() { setAuthMode("signup"); setPage("auth"); }

  function handleLogin(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setPage("home");
  }

  function handleLogout() {
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
    setPage("home");
  }

  return (
    <div className="app">
      <nav className="navbar">
        <button className="logo logo-button" onClick={() => setPage("home")}>SeonbaeON<span>.</span></button>

        <div className="nav-links">
          <button onClick={() => setPage("home")}>Home</button>
          <button onClick={() => setPage("teachers")}>Find Teachers</button>
          <button onClick={() => {
            setPage("home");
            setTimeout(() => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }), 0);
          }}>How It Works</button>
          <button onClick={() => {
            setPage("home");
            setTimeout(() => document.getElementById("home")?.scrollIntoView({ behavior: "smooth" }), 0);
          }}>About</button>
        </div>

        <div className="nav-buttons">
          {currentUser ? (
            <>
              <span className="nav-user">Hi, {currentUser.name || currentUser.email}</span>
              <button className="login-btn" onClick={handleLogout}>Logout</button>
            </>
          ) : (
            <>
              <button className="login-btn" onClick={openLogin}>Login</button>
              <button className="signup-btn" onClick={openSignup}>Get Started</button>
            </>
          )}
        </div>
      </nav>

      {page === "home" && <HomePage goToTeachers={() => setPage("teachers")} />}
      {page === "teachers" && (
        <TeacherSearch
          goHome={() => setPage("home")}
          openProfile={(teacher) => { setSelectedTeacher(teacher); setPage("profile"); }}
        />
      )}
      {page === "profile" && (
        <TeacherProfile
          teacher={selectedTeacher}
          currentUser={currentUser}
          goBack={() => setPage("teachers")}
        />
      )}
      {page === "auth" && <AuthPage mode={authMode} setMode={setAuthMode} onLogin={handleLogin} />}
    </div>
  );
}

export default App;

