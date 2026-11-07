import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import "./premium.css";
import "./dark-premium.css";
import "./refined-premium.css";

const API_URL = `${(import.meta.env.VITE_API_URL || "https://seonbaeon-backend.onrender.com").replace(/\/$/, "")}/api`;
const FAVORITES_KEY = "pick-my-teacher-favorites";
const USER_KEY = "pick-my-teacher-logged-user";

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
  const [accountRole, setAccountRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forgotMode, setForgotMode] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

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

      const endpoint =
        mode === "signup" ? "/users/signup" : "/users/login";

      const body =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
              role: accountRole,
            }
          : {
              email: email.trim(),
              password,
              role: accountRole,
            };

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 180000);
      let response;
      try {
        response = await fetch(`${API_URL}${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (requestError) {
        if (requestError.name === "AbortError") {
          throw new Error("The server is taking longer than expected to wake up. Please try again in a moment.");
        }
        throw new Error("Could not reach the login server. Please check your connection and try again.");
      } finally {
        window.clearTimeout(timeoutId);
      }

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

  async function handleForgotPassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!forgotEmail.trim()) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/users/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: forgotEmail.trim(),
          }),
        }
      );

      const data = await readResponse(response);

      setMessage(
        data.message ||
          "If an account exists with this email, a password reset link has been sent."
      );
    } catch (err) {
      setError(
        err.message ||
          "Unable to send the password reset email."
      );
    } finally {
      setLoading(false);
    }
  }

  if (forgotMode) {
    return (
      <div className="auth-page auth-premium-redesign">
        <div className="auth-card">
          <div className="auth-heading">
            <div className="auth-logo">
              Pick My Teacher<span>.</span>
            </div>

            <h1>Forgot Password?</h1>

            <p>
              Enter your email and we will send you a
              password reset link.
            </p>
          </div>

          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          {message && (
            <div className="form-success">
              {message}
            </div>
          )}

          <form onSubmit={handleForgotPassword}>
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter your email"
              value={forgotEmail}
              onChange={(e) =>
                setForgotEmail(e.target.value)
              }
            />

            <button
              className="auth-submit"
              type="submit"
              disabled={loading}
            >
              {loading
                ? "Sending..."
                : "Send Reset Link →"}
            </button>
          </form>

          <div className="auth-switch">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => {
                setForgotMode(false);
                setError("");
                setMessage("");
              }}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-heading">
          <div className="auth-logo">
            Pick My Teacher<span>.</span>
          </div>

          <h1>
            {mode === "login"
              ? "Welcome Back"
              : "Create Your Account"}
          </h1>

          <p>
            {mode === "login"
              ? "Login to continue your teacher discovery journey."
              : "Join Pick My Teacher and find the right English teacher for your child."}
          </p>
        </div>

        {error && (
          <div className="form-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === "login" && (
            <>
              <label>Login As</label>
              <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
                <option value="STUDENT">Student / Parent</option>
                <option value="TEACHER">English Teacher</option>
                <option value="ADMIN">Admin</option>
              </select>
            </>
          )}

          {mode === "signup" && (
            <>
              <label>Account Type</label>
              <select value={accountRole} onChange={(e) => setAccountRole(e.target.value)}>
                <option value="STUDENT">Student / Parent</option>
                <option value="TEACHER">English Teacher</option>
              </select>
              <label>Full Name</label>

              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />
            </>
          )}

          <label>Email</label>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          {mode === "login" && (
            <div
              style={{
                textAlign: "right",
                marginTop: "-8px",
                marginBottom: "16px",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setForgotMode(true);
                  setForgotEmail(email);
                  setError("");
                  setMessage("");
                }}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "#6c63ff",
                  fontSize: "14px",
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Connecting to server..."
              : mode === "login"
              ? "Login →"
              : "Create Account →"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                  setMessage("");
                }}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
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
  const categories = ["Kids English", "Phonics", "Speaking", "Reading & Writing", "Grammar", "Storytelling", "School English"];
  return (
    <div className="home-premium-redesign" id="pmt-home-v3">
      <section className="hero-section" id="home">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="small-title"><span className="hero-kicker-dot" /> A MORE CONFIDENT WAY TO LEARN ENGLISH</p>
            <h1>Choose the right teacher.<br /><span>Start with confidence.</span></h1>
            <p className="hero-text">Finding an English teacher should feel simple. Explore teaching styles, watch demo lessons, compare profiles and choose the right fit for your learning goals.</p>
            <div className="hero-buttons">
              <button className="primary-btn" onClick={goToTeachers}>Explore English teachers <span aria-hidden="true">↗</span></button>
              <button className="secondary-btn" onClick={() => document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}>See how it works</button>
            </div>
            <div className="hero-feature-line"><span>Teacher profiles</span><i /> <span>Demo lessons</span><i /> <span>Student reviews</span></div>
          </div>
          <div className="hero-card" aria-label="Preview of the teacher discovery experience">
            <div className="hero-preview-top"><span className="preview-window-dots"><i/><i/><i/></span><span>TEACHER DISCOVERY</span><span className="preview-live-dot">●</span></div>
            <div className="hero-preview-body">
              <div className="preview-label">YOUR LEARNING JOURNEY</div>
              <h2>Find a teacher who fits <em>your goals.</em></h2>
              <p>Explore the details that help you make a thoughtful choice.</p>
              <div className="preview-feature"><span className="preview-icon">01</span><div><strong>Explore teaching profiles</strong><small>Experience, approach and specialties</small></div><b>↗</b></div>
              <div className="preview-feature"><span className="preview-icon">02</span><div><strong>Watch sample lessons</strong><small>Get a feel for each teaching style</small></div><b>↗</b></div>
              <div className="preview-feature"><span className="preview-icon">03</span><div><strong>Compare with confidence</strong><small>Reviews and details in one place</small></div><b>↗</b></div>
              <button className="preview-action" onClick={goToTeachers}>Start exploring <span>→</span></button>
            </div>
            <div className="hero-preview-foot"><span> PICK MY TEACHER</span><span>LEARN WITH CLARITY</span></div>
          </div>
        </div>
        <div className="hero-bottom-note"><span>MADE FOR BETTER TEACHER DISCOVERY</span><span>ENGLISH LEARNING · YOUR WAY</span></div>
      </section>

      <section className="home-categories-section">
        <div className="home-section-heading"><div><p className="home-eyebrow">EXPLORE YOUR OPTIONS</p><h2>English learning, shaped around you.</h2></div><p>From first words to confident conversations, discover a teaching focus that matches your next step.</p></div>
        <div className="home-category-grid">
          {categories.map((category,index)=><button type="button" className="home-category-card" key={category} onClick={goToTeachers}><span className="category-index">0{index+1}</span><strong>{category}</strong><span className="category-arrow">↗</span></button>)}
        </div>
      </section>

      <section className="how-section home-process-section" id="how">
        <div className="home-section-heading"><div><p className="home-eyebrow">A CLEARER WAY TO CHOOSE</p><h2>From browsing to your<br/><span>best-fit teacher.</span></h2></div><p>No guesswork. Get a closer look at the people behind the lessons before you decide.</p></div>
        <div className="steps">
          <article className="step"><div className="step-number">01</div><h3>Discover</h3><p>Browse English teachers by learning focus, teaching style and profile details.</p></article>
          <article className="step"><div className="step-number">02</div><h3>Get a feel</h3><p>Watch demo lessons to understand how a teacher explains and engages.</p></article>
          <article className="step"><div className="step-number">03</div><h3>Compare</h3><p>Review qualifications, teaching information and feedback side by side.</p></article>
          <article className="step"><div className="step-number">04</div><h3>Connect</h3><p>Request an introduction and take the next step when you feel ready.</p></article>
        </div>
      </section>

      <section className="home-final-cta">
        <div><p className="home-eyebrow">YOUR NEXT STEP STARTS HERE</p><h2>Make your next English class<br/>a more confident choice.</h2><p>Explore teacher profiles and find a learning approach that feels right.</p></div>
        <button className="home-cta-button" onClick={goToTeachers}>Find your English teacher <span>↗</span></button>
      </section>

      <footer className="home-premium-footer"><div className="footer-brand"><div className="logo">Pick My Teacher<span>.</span></div><p>Know your teacher before you join.</p></div><div className="footer-links"><button onClick={goToTeachers}>Find Teachers</button><button onClick={()=>document.getElementById("how")?.scrollIntoView({behavior:"smooth"})}>How It Works</button></div><div className="copyright">© 2026 Pick My Teacher. All rights reserved.</div></footer>
    </div>
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
  const [rating, setRating] = useState("All");
  const [search, setSearch] = useState("");

  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(
        localStorage.getItem(FAVORITES_KEY) || "[]"
      );
    } catch {
      return [];
    }
  });

  const [compareTeachers, setCompareTeachers] = useState([]);
  const [showCompare, setShowCompare] = useState(false);

  async function loadTeachers() {
    const controller = new AbortController();
    let timeoutId;
    try {
      setLoading(true);
      setError("");
      const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error("Teacher loading timed out after 15 seconds. Please retry."));
        }, 15000);
      });
      const request = (async () => {
        const response = await fetch(`${API_URL}/teachers`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        const data = await readResponse(response);
        const list = Array.isArray(data)
          ? data
          : (Array.isArray(data?.teachers)
            ? data.teachers
            : (Array.isArray(data?.content) ? data.content : null));
        if (!list) throw new Error("The server returned an unexpected teacher list. Please try again.");
        return list;
      })();
      const list = await Promise.race([request, timeout]);
      setTeachers(list);
    } catch (err) {
      setError(err.message || "Could not connect to the teacher service. Please retry.");
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favorites)
    );
  }, [favorites]);

  const filteredTeachers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const categoryMatch =
        category === "All" ||
        (category === "Favorites"
          ? favorites.includes(teacher.id)
          : teacher.category === category);

      const locationMatch =
        location === "All" ||
        teacher.location === location;

      const ratingMatch =
        rating === "All" ||
        Number(teacher.rating || 0) >= Number(rating);

      const searchMatch =
        !text ||
        [
          teacher.name,
          teacher.category,
          teacher.specialty,
          teacher.location,
          teacher.teachingStyle,
          teacher.qualification,
          teacher.bio,
          teacher.ageRange,
          teacher.teachingMode,
          teacher.languages,
        ].some((value) =>
          String(value || "")
            .toLowerCase()
            .includes(text)
        );

      return (
        categoryMatch &&
        locationMatch &&
        ratingMatch &&
        searchMatch
      );
    });
  }, [
    teachers,
    category,
    location,
    rating,
    search,
    favorites,
  ]);

  function toggleFavorite(id) {
    setFavorites((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function toggleCompare(teacher) {
    setCompareTeachers((current) => {
      if (
        current.some(
          (item) => item.id === teacher.id
        )
      ) {
        return current.filter(
          (item) => item.id !== teacher.id
        );
      }

      if (current.length >= 2) {
        alert(
          "You can compare up to 2 English teachers."
        );
        return current;
      }

      return [...current, teacher];
    });
  }

  return (
    <div className="teachers-page teacher-search-redesign">
      <div className="teachers-header">
        <button
          className="back-home"
          onClick={goHome}
        >Back to Home</button>

        <div>
          <p className="small-title">
            FIND YOUR ENGLISH TEACHER
          </p>

          <h1>
            Find the right English teacher for you.
          </h1>

          <p>
            Explore English teachers, compare their
            experience, teaching style and reviews.
          </p>
        </div>
      </div>

      <div className="teacher-search-area">
        <div className="search-top">
          <div className="search-input-wrapper">
            <span>Search</span><input type="text"
              placeholder="Search teacher, category or specialty..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <select
            value={category}
            onChange={(e) =>
              setCategory(e.target.value)
            }
          >
            <option value="All">
              All English Categories
            </option>

            {ENGLISH_CATEGORIES.slice(1).map(
              (item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              )
            )}

            <option value="Favorites">
              My Favorites
            </option>
          </select>

                      <select
              value={rating}
              onChange={(e) =>
                setRating(e.target.value)
              }
              aria-label="Filter by rating"
            >
              <option value="All">All Ratings</option>
              <option value="4.5">4.5+ Rating</option>
              <option value="4">4.0+ Rating</option>
              <option value="3.5">3.5+ Rating</option>
            </select>
<select
            value={location}
            onChange={(e) =>
              setLocation(e.target.value)
            }
          >
            <option value="All">
              All Locations
            </option>
            <option value="Busan">Busan</option>
            <option value="Seoul">Seoul</option>
            <option value="Daegu">Daegu</option>
          </select>
        </div>

        <div className="results-header">
          <strong>
            {!loading && !error ? `${filteredTeachers.length} English teachers found` : loading ? "Finding English teachers..." : ""}
          </strong>

          <span>
            English teachers for Korean children
          </span>
        </div>

        {loading && (
          <div className="no-results">
            <div>Loading</div><h2>Loading teachers...</h2>

            <p>
              Getting English teachers from the
              Pick My Teacher database.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="no-results">
            <div>Warning</div><h2>Backend connection problem</h2>

            <p>{error}</p>

            <p>
              Make sure the Pick My Teacher backend is
              available.
            </p>
            <button type="button" className="teacher-retry-btn" onClick={loadTeachers}>Try again ↻</button>
          </div>
        )}

        {!loading &&
          !error &&
          compareTeachers.length > 0 && (
            <div className="compare-bar">
              <div className="compare-title">
                <strong>
                  Compare English Teachers
                </strong>

                <span>
                  {compareTeachers.length} teacher
                  {compareTeachers.length > 1
                    ? "s"
                    : ""}{" "}
                  selected
                </span>
              </div>

              <div className="compare-selected">
                {compareTeachers.map((teacher) => (
                  <div
                    className="compare-mini-card"
                    key={teacher.id}
                  >
                    <span>{teacher.profileImageUrl ? (<img src={teacher.profileImageUrl} alt={teacher.name} onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement.textContent = (teacher.name || "Teacher").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }} />) : ((teacher.name || "Teacher").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase())}</span>

                    <strong>{teacher.name}</strong>

                    <button
                      onClick={() =>
                        toggleCompare(teacher)
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="compare-now-btn"
                disabled={
                  compareTeachers.length < 2
                }
                onClick={() =>
                  setShowCompare(true)
                }
              >
                Compare Now →
              </button>
            </div>
          )}

        {!loading &&
          !error &&
          filteredTeachers.length > 0 && (
            <div className="teacher-grid">
              {filteredTeachers.map((teacher) => (
                <div
                  className="teacher-card"
                  key={teacher.id}
                >
                  <button
                    className={`favorite-btn ${
                      favorites.includes(teacher.id)
                        ? "favorite-active"
                        : ""
                    }`}
                    onClick={() =>
                      toggleFavorite(teacher.id)
                    }
                  >
                    {favorites.includes(teacher.id)
                      ? "♥"
                      : "♡"}
                  </button>

                  <div className="teacher-card-top">
                    <div className="teacher-avatar">
                      {teacher.profileImageUrl ? (
                        <img
                          src={teacher.profileImageUrl}
                          alt={teacher.name}
                        />
                      ) : (
                        (teacher.name || "Teacher")
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="rating">
                      {teacher.rating
                        ? `${Number(teacher.rating).toFixed(1)} rating`
                        : "Rating unavailable"}
                    </div>
                  </div>

                  <h2>{teacher.name}</h2>

                  <p className="teacher-specialty">
                    {teacher.specialty}
                  </p>

                  <div className="teacher-tags">
                    <span>{teacher.category}</span>

                    <span>{teacher.location}</span>

                    <span>
                      {teacher.teachingStyle}
                    </span>
                  </div>

                  <div className="teacher-stats">
                    <div>
                      <strong>
                        {teacher.experience}
                      </strong>

                      <small>Experience</small>
                    </div>

                    <div>
                      <strong>
                        {teacher.studentCount}+
                      </strong>

                      <small>Students</small>
                    </div>

                    <div>
                      <strong>
                        {teacher.reviewCount}
                      </strong>

                      <small>Reviews</small>
                    </div>
                  </div>

                  <div className="teacher-actions">
                    <button
                      className="profile-btn"
                      onClick={() =>
                        openProfile(teacher)
                      }
                    >
                      View Profile
                    </button>

                    <button
                      className="compare-btn"
                      onClick={() =>
                        toggleCompare(teacher)
                      }
                    >
                      {compareTeachers.some(
                        (item) =>
                          item.id === teacher.id
                      )
                        ? "Added"
                        : "Compare"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

        {!loading &&
          !error &&
          filteredTeachers.length === 0 && (
            <div className="no-results empty-state">
              <div className="status-label">No results</div>

              <h2>No English teachers found</h2>

              <p>
                Try changing your search or filters.
              </p>
            </div>
          )}

        {showCompare &&
          compareTeachers.length === 2 && (
            <CompareModal
              teachers={compareTeachers}
              onClose={() =>
                setShowCompare(false)
              }
            />
          )}
      </div>
    </div>
  );
}

/* =========================
   COMPARE MODAL
========================= */

function CompareModal({ teachers, onClose }) {
  const formatValue = (value, fallback = "Not provided") => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    return value;
  };

  const formatStudents = (value) => {
    if (!value) return "Not provided";
    return `${Number(value).toLocaleString()}+`;
  };

  const formatReviews = (value) => {
    if (!value) return "No reviews yet";
    return `${Number(value).toLocaleString()} reviews`;
  };

  const formatRate = (value) => {
    if (!value) return "Not provided";
    return `₩${Number(value).toLocaleString()}/hour`;
  };

  const formatDuration = (value) => {
    if (!value) return "Not provided";

    const text = String(value).toLowerCase();

    if (
      text.includes("min") ||
      text.includes("hour")
    ) {
      return value;
    }

    return `${value} minutes`;
  };

  const comparisonFields = [
    ["Category", "category"],
    ["Specialty", "specialty"],
    ["Location", "location"],
    ["Experience", "experience"],
    ["Students", "studentCount"],
    ["Teaching Style", "teachingStyle"],
    ["Reviews", "reviewCount"],
    ["Hourly Rate", "hourlyRate"],
    ["Lesson Duration", "lessonDuration"],
    ["Teaching Mode", "teachingMode"],
  ];

  return (
    <div
      className="compare-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-title"
    >
      <div className="compare-modal">
        <button
          className="compare-close"
          onClick={onClose}
          aria-label="Close comparison"
          type="button"
        >
          ×
        </button>

        <div className="compare-modal-heading">
          <p className="small-title">
            ENGLISH TEACHER COMPARISON
          </p>

          <h2 id="compare-title">
            Compare Teachers
          </h2>

          <p className="compare-subtitle">
            Compare two English teachers side by side
            before choosing the right fit.
          </p>
        </div>

        <div className="comparison-table">
          <div className="comparison-row comparison-header">
            <div className="comparison-feature-heading">
              Feature
            </div>

            {teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="comparison-teacher"
              >
                <div className="comparison-avatar">
                  {teacher.profileImageUrl ? (
                    <img
                      src={teacher.profileImageUrl}
                      alt={teacher.name}
                      onError={(event) => {
                        event.currentTarget.style.display =
                          "none";

                        event.currentTarget.parentElement.textContent =
                          (teacher.name || "Teacher")
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();
                      }}
                    />
                  ) : (
                    (teacher.name || "Teacher")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </div>

                <strong>{teacher.name}</strong>

                <span className="comparison-rating">
                  <span aria-hidden="true">★</span>{" "}
                  {teacher.rating
                    ? Number(teacher.rating).toFixed(1)
                    : "N/A"}
                </span>
              </div>
            ))}
          </div>

          {comparisonFields
            .filter(([, key]) =>
              teachers.some(
                (teacher) =>
                  teacher[key] !== null &&
                  teacher[key] !== undefined &&
                  teacher[key] !== ""
              )
            )
            .map(([label, key]) => (
              <div
                className="comparison-row"
                key={key}
              >
                <div className="comparison-feature-label">
                  {label}
                </div>

                {teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="comparison-value"
                  >
                    {key === "studentCount"
                      ? formatStudents(teacher[key])
                      : key === "reviewCount"
                      ? formatReviews(teacher[key])
                      : key === "hourlyRate"
                      ? formatRate(teacher[key])
                      : key === "lessonDuration"
                      ? formatDuration(teacher[key])
                      : formatValue(teacher[key])}
                  </div>
                ))}
              </div>
            ))}
        </div>

        <div className="comparison-actions">
          <button
            className="comparison-secondary"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   TEACHER PROFILE
========================= */

function TeacherProfile({
  teacher,
  goBack,
  currentUser,
}) {
  const [showConsultation, setShowConsultation] =
    useState(false);

  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] =
    useState(true);
  const [reviewError, setReviewError] =
    useState("");
  const [reviewEligibility, setReviewEligibility] = useState({
    loading: true,
    eligible: false,
    alreadyReviewed: false,
    error: "",
  });

  const [reviewRating, setReviewRating] =
    useState(5);

  const [reviewText, setReviewText] =
    useState("");

  const [reviewSubmitting, setReviewSubmitting] =
    useState(false);

  const [consultSubmitting, setConsultSubmitting] =
    useState(false);

  const [consultMessage, setConsultMessage] =
    useState("");

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [videos, setVideos] = useState([]);
  const [videoLoading, setVideoLoading] =
    useState(true);
  const [selectedVideo, setSelectedVideo] =
    useState(null);
  const [profileImageFailed, setProfileImageFailed] =
    useState(false);
  const [videoImageErrors, setVideoImageErrors] =
    useState({});
  const [videoPlaybackError, setVideoPlaybackError] =
    useState(false);

  useEffect(() => {
    if (!teacher) return;

    setProfileImageFailed(false);
    setVideoPlaybackError(false);
    setVideoImageErrors({});

    try {
      const saved = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) ||
          "[]"
      );

      setIsFavorite(saved.includes(teacher.id));
    } catch {
      setIsFavorite(false);
    }
  }, [teacher]);

  /* =========================
     LOAD REVIEWS
  ========================= */

  useEffect(() => {
    if (!teacher) return;

    async function loadReviews() {
      try {
        setReviewLoading(true);
        setReviewError("");

        const response = await fetch(
          `${API_URL}/teachers/${teacher.id}/reviews`
        );

        const data = await readResponse(response);

        setReviews(
          Array.isArray(data) ? data : []
        );
      } catch (err) {
        setReviewError(
          err.message || "Could not load reviews."
        );
      } finally {
        setReviewLoading(false);
      }
    }

    loadReviews();
  }, [teacher]);

  useEffect(() => {
    if (!teacher) return;

    let cancelled = false;

    async function checkReviewEligibility() {
      if (!currentUser?.token || currentUser?.role !== "STUDENT") {
        setReviewEligibility({
          loading: false,
          eligible: false,
          alreadyReviewed: false,
          error: "",
        });
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/teachers/${teacher.id}/reviews/eligibility`,
          { headers: { Authorization: `Bearer ${currentUser.token}` } }
        );
        const data = await readResponse(response);
        if (!cancelled) {
          setReviewEligibility({
            loading: false,
            eligible: Boolean(data?.eligible),
            alreadyReviewed: Boolean(data?.alreadyReviewed),
            error: "",
          });
        }
      } catch (err) {
        if (!cancelled) {
          setReviewEligibility({
            loading: false,
            eligible: false,
            alreadyReviewed: false,
            error: err.message || "Could not check review eligibility.",
          });
        }
      }
    }

    setReviewEligibility({
      loading: true,
      eligible: false,
      alreadyReviewed: false,
      error: "",
    });
    checkReviewEligibility();

    return () => { cancelled = true; };
  }, [teacher, currentUser]);

  /* =========================
     LOAD MULTIPLE VIDEOS
  ========================= */

  useEffect(() => {
    if (!teacher) return;

    async function loadVideos() {
      try {
        setVideoLoading(true);

        const response = await fetch(
          `${API_URL}/teachers/${teacher.id}/videos`
        );

        const data = await readResponse(response);

        const videoList = Array.isArray(data)
          ? data
          : [];

        setVideos(videoList);

        if (videoList.length > 0) {
          setSelectedVideo(videoList[0]);
        } else if (
          teacher.demoVideoUrl
        ) {
          setSelectedVideo({
            id: "legacy-demo",
            title: "Demo Class",
            description:
              "Teacher demo video.",
            videoUrl: teacher.demoVideoUrl,
            videoType:
              teacher.demoVideoType || "youtube",
            thumbnailUrl: "",
          });
        } else {
          setSelectedVideo(null);
        }
      } catch (err) {
        console.error(
          "Could not load teacher videos:",
          err
        );

        if (teacher.demoVideoUrl) {
          setVideos([
            {
              id: "legacy-demo",
              title: "Demo Class",
              description:
                "Teacher demo video.",
              videoUrl: teacher.demoVideoUrl,
              videoType:
                teacher.demoVideoType || "youtube",
              thumbnailUrl: "",
            },
          ]);

          setSelectedVideo({
            id: "legacy-demo",
            title: "Demo Class",
            description:
              "Teacher demo video.",
            videoUrl: teacher.demoVideoUrl,
            videoType:
              teacher.demoVideoType || "youtube",
            thumbnailUrl: "",
          });
        } else {
          setVideos([]);
          setSelectedVideo(null);
        }
      } finally {
        setVideoLoading(false);
      }
    }

    loadVideos();
  }, [teacher]);

  if (!teacher) {
    return (
      <div className="no-results">
        <h2>No teacher selected.</h2>

        <button
          className="primary-btn"
          onClick={goBack}
        >
          Back to Teachers
        </button>
      </div>
    );
  }

  function toggleProfileFavorite() {
    let saved = [];

    try {
      saved = JSON.parse(
        localStorage.getItem(FAVORITES_KEY) ||
          "[]"
      );
    } catch {
      saved = [];
    }

    const next = saved.includes(teacher.id)
      ? saved.filter(
          (id) => id !== teacher.id
        )
      : [...saved, teacher.id];

    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(next)
    );

    setIsFavorite(
      next.includes(teacher.id)
    );
  }

  async function submitConsultation(e) {
    e.preventDefault();

    if (!currentUser?.token || currentUser?.role !== "STUDENT") {
      setConsultMessage("Please log in with your Student / Parent account before requesting a consultation.");
      return;
    }

    setConsultSubmitting(true);
    setConsultMessage("");

    const formElement = e.currentTarget;
    const form = new FormData(formElement);

    const body = {
      teacherId: teacher.id,
      studentName: String(
        form.get("studentName") || ""
      ).trim(),
      email: String(
        form.get("email") || ""
      ).trim(),
      phone: String(
        form.get("phone") || ""
      ).trim(),
      preferredDate: String(
        form.get("preferredDate") || ""
      ),
      preferredTime: String(
        form.get("preferredTime") || ""
      ),
      message: String(
        form.get("message") || ""
      ).trim(),
    };

    try {
      const response = await fetch(
        `${API_URL}/consultations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify(body),
        }
      );

      const data =
        await readResponse(response);

      alert(
        data.message ||
          "Consultation request sent successfully!"
      );

      setShowConsultation(false);
      formElement.reset();
    } catch (err) {
      setConsultMessage(
        err.message ||
          "Could not send the consultation request."
      );
    } finally {
      setConsultSubmitting(false);
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    if (!reviewText.trim()) {
      return;
    }
    if (!currentUser?.token || currentUser?.role !== "STUDENT") {
      setReviewError("Please log in with a Student account to submit a review.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");

    try {
      const response = await fetch(
        `${API_URL}/teachers/${teacher.id}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${currentUser.token}`,
          },
          body: JSON.stringify({
            rating: Number(reviewRating),
            text: reviewText.trim(),
          }),
        }
      );

      const saved =
        await readResponse(response);

      setReviews((current) => [
        saved,
        ...current,
      ]);
      setReviewEligibility((current) => ({
        ...current,
        alreadyReviewed: true,
      }));

      setReviewText("");
      setReviewRating(5);
    } catch (err) {
      setReviewError(
        err.message ||
          "Could not submit the review."
      );
    } finally {
      setReviewSubmitting(false);
    }
  }

  function getYoutubeVideoId(video) {
    if (!video?.videoUrl) return "";

    const raw = String(video.videoUrl).trim();

    try {
      const parsed = new URL(
        raw.startsWith("http://") || raw.startsWith("https://")
          ? raw
          : `https://www.youtube.com/watch?v=${raw}`
      );

      if (parsed.hostname.includes("youtu.be")) {
        return parsed.pathname.replace(/^\//, "").split("/")[0];
      }

      if (parsed.searchParams.get("v")) {
        return parsed.searchParams.get("v");
      }

      const embedMatch = parsed.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    } catch {
      return raw.split("/").pop()?.split("?")[0] || "";
    }

    return "";
  }

  function isYoutubeVideo(video) {
    const url = String(video?.videoUrl || "").toLowerCase();
    return (
      video?.videoType === "youtube" ||
      url.includes("youtube.com") ||
      url.includes("youtu.be")
    );
  }

  function getVideoEmbedUrl(video) {
    if (!video?.videoUrl) return "";

    if (isYoutubeVideo(video)) {
      const videoId = getYoutubeVideoId(video);
      return videoId
        ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
        : "";
    }

    return String(video.videoUrl).trim();
  }

  function getVideoThumbnail(video) {
    if (video?.thumbnailUrl) return video.thumbnailUrl;

    const videoId = getYoutubeVideoId(video);
    return videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : "";
  }

  function scrollToVideo() {
    setTimeout(() => {
      document
        .querySelector(".demo-video-player")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  }

  return (
    <div className="profile-page teacher-profile-redesign">
      <div className="profile-container">

        {/* =========================
            CONSULTATION MODAL
        ========================= */}

        {showConsultation && (
          <div className="consultation-overlay">
            <div className="consultation-modal">
              <button
                className="close-consultation"
                onClick={() =>
                  setShowConsultation(false)
                }
              >
                ×
              </button>

              <h2>Request Consultation</h2>

              <p>
                Send a consultation request to{" "}
                {teacher.name}.
              </p>

              {consultMessage && (
                <div className="form-error">
                  {consultMessage}
                </div>
              )}

              <form
                onSubmit={submitConsultation}
              >
                <label>Student Name</label>

                <input
                  name="studentName"
                  type="text"
                  placeholder="Enter your name"
                  defaultValue={
                    currentUser?.name || ""
                  }
                  required
                />

                <label>Email</label>

                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  defaultValue={
                    currentUser?.email || ""
                  }
                  readOnly={currentUser?.role === "STUDENT"}
                  required
                />

                <label>Phone</label>

                <input
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                />

                <label>
                  Preferred Date
                </label>

                <input
                  name="preferredDate"
                  type="date"
                  required
                />

                <label>
                  Preferred Time
                </label>

                <input
                  name="preferredTime"
                  type="time"
                  required
                />

                <label>Message</label>

                <textarea
                  name="message"
                  placeholder="Tell the teacher what you would like to discuss..."
                  rows="4"
                />

                <button
                  type="submit"
                  className="submit-consultation"
                  disabled={
                    consultSubmitting
                  }
                >
                  {consultSubmitting
                    ? "Sending..."
                    : "Send Request"}
                </button>
              </form>
            </div>
          </div>
        )}

        <button
          className="back-home"
          onClick={goBack}
        >Back to Home</button>

        {/* =========================
            PROFILE HEADER
        ========================= */}

        <div className="profile-header">
          <div className={`profile-avatar ${
            teacher.profileImageUrl && !profileImageFailed
              ? "has-photo"
              : "has-initials"
          }`}>
            {teacher.profileImageUrl && !profileImageFailed ? (
              <img
                src={teacher.profileImageUrl}
                alt={`${teacher.name} profile`}
                loading="eager"
                onError={() => setProfileImageFailed(true)}
              />
            ) : (
              <span className="avatar-initials" aria-label={`${teacher.name} initials`}>
                {(teacher.name || "Teacher")
                  .split(" ")
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </span>
            )}
          </div>

          <div className="profile-main-info">
            <div className="profile-name-row">
              <div>
                <div className="profile-name-line">
                  <h1>{teacher.name}</h1>

                  {teacher.verified && (
                    <span
                      className="verified-badge"
                      title="Verified Teacher"
                    >
                      ✓ Verified
                    </span>
                  )}
                </div>

                <p>{teacher.specialty}</p>
              </div>

              <button
                className="profile-favorite"
                onClick={
                  toggleProfileFavorite
                }
              >
                {isFavorite ? "♥" : "♡"}
              </button>
            </div>

            <div className="profile-tags">
              {teacher.category && (
                <span>{teacher.category}</span>
              )}

              {teacher.location && (
                <span>{teacher.location}</span>
              )}

              {typeof teacher.available === "boolean" && (
                <span className={teacher.available ? "availability-tag is-available" : "availability-tag"}>
                  <span className="availability-dot" aria-hidden="true" />
                  {teacher.available ? "Currently available" : "Currently unavailable"}
                </span>
              )}
            </div>

            <div className="profile-stat-row" aria-label="Teacher overview">
              {teacher.rating && (
                <div className="profile-stat">
                  <strong>{teacher.rating}</strong>
                  <span>Rating</span>
                </div>
              )}

              {teacher.reviewCount && (
                <div className="profile-stat">
                  <strong>{teacher.reviewCount}</strong>
                  <span>Reviews</span>
                </div>
              )}

              {teacher.experience && (
                <div className="profile-stat">
                  <strong>{teacher.experience}</strong>
                  <span>Experience</span>
                </div>
              )}

              {teacher.studentCount && (
                <div className="profile-stat">
                  <strong>{teacher.studentCount}+</strong>
                  <span>Students taught</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="profile-left">

            {/* =========================
                ABOUT
            ========================= */}

            {teacher.bio && (
              <section className="profile-section">
                <h2>About the Teacher</h2>
                <p>{teacher.bio}</p>
              </section>
            )}

            {/* =========================
                QUALIFICATIONS
            ========================= */}

            {(teacher.qualification || teacher.experience || teacher.studentCount) && (
              <section className="profile-section">
                <div className="section-heading-block">
                  <span className="section-eyebrow">CREDENTIALS</span>
                  <h2>Qualifications & Experience</h2>
                </div>

                <div className="qualification-list">
                  {teacher.qualification && (
                    <div className="qualification-item">
                      <span className="qualification-marker">01</span>
                      <div>
                        <strong>Teaching Qualification</strong>
                        <p>{teacher.qualification}</p>
                      </div>
                    </div>
                  )}

                  {teacher.experience && (
                    <div className="qualification-item">
                      <span className="qualification-marker">02</span>
                      <div>
                        <strong>{teacher.experience} teaching experience</strong>
                        <p>Professional English teaching experience.</p>
                      </div>
                    </div>
                  )}

                  {teacher.studentCount && (
                    <div className="qualification-item">
                      <span className="qualification-marker">03</span>
                      <div>
                        <strong>{teacher.studentCount}+ students taught</strong>
                        <p>Previous learners supported through English classes.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* =========================
                TEACHING STYLE
            ========================= */}

            {teacher.teachingStyle && (
              <section className="profile-section">
                <div className="section-heading-block">
                  <span className="section-eyebrow">APPROACH</span>
                  <h2>Teaching Style</h2>
                </div>

                <div className="style-card">
                  <div className="style-icon">STYLE</div>
                  <div>
                    <h3>{teacher.teachingStyle}</h3>
                    <p>
                      A quick look at this teacher's approach can help you decide whether the class is a good fit for your learner.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* =========================
                TEACHING DETAILS
            ========================= */}

            {(teacher.category || teacher.specialty || teacher.ageRange || teacher.teachingMode || teacher.languages || teacher.availability || typeof teacher.available === "boolean" || teacher.hourlyRate || teacher.lessonDuration) && (
              <section className="profile-section">
                <div className="section-heading-block">
                  <span className="section-eyebrow">CLASS INFORMATION</span>
                  <h2>Teaching Details</h2>
                </div>

                <div className="teaching-details-grid">
                {teacher.category && (
                  <div><span>Category</span><strong>{teacher.category}</strong></div>
                )}
                {teacher.specialty && (
                  <div><span>Specialty</span><strong>{teacher.specialty}</strong></div>
                )}
                {teacher.ageRange && (
                  <div><span>Age Range</span><strong>{teacher.ageRange}</strong></div>
                )}
                {teacher.teachingMode && (
                  <div><span>Teaching Mode</span><strong>{teacher.teachingMode}</strong></div>
                )}
                {teacher.languages && (
                  <div><span>Languages</span><strong>{teacher.languages}</strong></div>
                )}
                {(teacher.availability || typeof teacher.available === "boolean") && (
                  <div>
                    <span>Availability</span>
                    <strong>
                      {teacher.availability ||
                        (teacher.available ? "Available" : "Not available")}
                    </strong>
                  </div>
                )}
                {teacher.hourlyRate && (
                  <div><span>Hourly Rate</span><strong>₩{Number(teacher.hourlyRate).toLocaleString()}</strong></div>
                )}
                {teacher.lessonDuration && (
                  <div><span>Lesson Duration</span><strong>{teacher.lessonDuration}</strong></div>
                )}
              </div>
            </section>
            )}

            {/* =========================
                MULTIPLE DEMO VIDEOS
            ========================= */}

            <section className="profile-section">
              <div className="section-title-row">
                <div>
                  <h2>Demo Classes</h2>

                  <p>
                    Watch sample lessons before
                    choosing your teacher.
                  </p>
                </div>

                {videos.length > 0 && (
                  <div className="video-count">
                    {videos.length} Demo
                    {videos.length > 1
                      ? "s"
                      : ""}
                  </div>
                )}
              </div>

              {videoLoading && (
                <div className="review-card">
                  <p>
                    Loading demo videos...
                  </p>
                </div>
              )}

              {!videoLoading &&
                selectedVideo && (
                  <>
                    <div className="demo-video">
                      <div className="demo-play-area">
                        {videoPlaybackError ? (
                          <div className="video-error-state">
                            <strong>Demo video unavailable</strong>
                            <p>This video could not be loaded right now. Please try another demo.</p>
                            {videos.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextVideo = videos.find((video) => video.id !== selectedVideo.id);
                                  if (nextVideo) {
                                    setSelectedVideo(nextVideo);
                                    setVideoPlaybackError(false);
                                  }
                                }}
                              >
                                Try another demo
                              </button>
                            )}
                          </div>
                        ) : isYoutubeVideo(selectedVideo) ? (
                          <iframe
                            className="demo-video-player"
                            src={getVideoEmbedUrl(selectedVideo)}
                            title={
                              selectedVideo.title ||
                              `Demo Class for ${teacher.name}`
                            }
                            frameBorder="0"
                            loading="lazy"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            onError={() => setVideoPlaybackError(true)}
                          />
                        ) : (
                          <video
                            className="demo-video-player"
                            controls
                            preload="metadata"
                            onError={() => setVideoPlaybackError(true)}
                          >
                            <source
                              src={selectedVideo.videoUrl}
                              type="video/mp4"
                            />
                            Your browser does not support the video tag.
                          </video>
                        )}
                      </div>

                      <div className="selected-video-info">
                        <h3>
                          {selectedVideo.title || "Demo Class"}
                        </h3>

                        <p>
                          {selectedVideo.description || "Teacher demo video."}
                        </p>

                        <button
                          className="watch-demo-btn"
                          onClick={scrollToVideo}
                        >
                          Watch Demo Class →
                        </button>
                      </div>
                    </div>

                    {videos.length > 0 && (
                      <div className="demo-library">
                        <div className="demo-library-heading">
                          <div>
                            <strong>More demo classes</strong>
                            <span>{videos.length} {videos.length === 1 ? "demo available" : "demos available"}</span>
                          </div>
                          {videos.length > 1 && (
                            <span className="demo-library-hint">Select a lesson to watch it above</span>
                          )}
                        </div>

                        <div className="video-gallery">
                        {videos.map((video, index) => (
                          <button
                            type="button"
                            key={
                              video.id ||
                              index
                            }
                            className={`video-gallery-card ${
                              selectedVideo?.id ===
                              video.id
                                ? "video-gallery-active"
                                : ""
                            }`}
                            onClick={() => {
                              setSelectedVideo(video);
                              setVideoPlaybackError(false);
                              scrollToVideo();
                            }}
                          >
                            <div className="video-thumbnail">
                              {getVideoThumbnail(video) && !videoImageErrors[video.id || index] ? (
                                <img
                                  src={getVideoThumbnail(video)}
                                  alt={video.title || "Demo class thumbnail"}
                                  loading="lazy"
                                  onError={() =>
                                    setVideoImageErrors((current) => ({
                                      ...current,
                                      [video.id || index]: true,
                                    }))
                                  }
                                />
                              ) : (
                                <div className="video-thumbnail-fallback">
                                  <span>DEMO</span>
                                  <small>{isYoutubeVideo(video) ? "Video lesson" : "Teacher recording"}</small>
                                </div>
                              )}
                              <span className="video-play-badge" aria-hidden="true">▶</span>
                            </div>

                            <div className="video-gallery-info">
                              <strong>
                                {video.title ||
                                  `Demo ${index + 1}`}
                              </strong>

                              <span>
                                Watch sample →
                              </span>
                            </div>
                          </button>
                        ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

              {!videoLoading &&
                !selectedVideo && (
                  <div className="review-card">
                    <p>
                      No demo video is available
                      yet.
                    </p>
                  </div>
                )}

              <p className="demo-disclaimer">
                Demo lessons are shown here so families can understand a teacher's teaching approach.
                Only teacher-specific recordings should be published on verified teacher profiles.
              </p>
            </section>

            {/* =========================
                REVIEWS
            ========================= */}

            <section className="profile-section">
              <div className="section-title-row">
                <div>
                  <h2>Student Reviews</h2>

                  <p>
                    Reviews from the Pick My Teacher community.
                  </p>
                </div>

                <div className="review-summary">
                  {teacher.rating ? `${teacher.rating} rating` : "Rating unavailable"}
                </div>
              </div>

              {reviewLoading && (
                <div className="review-card">
                  <p>
                    Loading reviews...
                  </p>
                </div>
              )}

              {!reviewLoading &&
                reviewError && (
                  <div className="form-error">
                    {reviewError}
                  </div>
                )}

              {!reviewLoading &&
                !reviewError &&
                reviews.length === 0 && (
                  <div className="review-card">
                    <p>
                      No reviews yet.
                    </p>
                  </div>
                )}

              {!reviewLoading &&
                reviews.map((review) => (
                  <div
                    className="review-card"
                    key={review.id}
                  >
                    <div className="review-top">
                      <strong>
                        {review.studentName}
                      </strong>

                      <span>
                        {review.rating ? `${review.rating}/5` : "Rating unavailable"}
                      </span>
                    </div>

                    <p>{review.text}</p>

                    <small>
                      {review.createdAt
                        ? new Date(
                            review.createdAt
                          ).toLocaleDateString()
                        : ""}
                    </small>
                    {currentUser?.role === "STUDENT" && review.reviewerUserId !== currentUser?.id && (
                      <button type="button" className="login-btn" onClick={async () => {
                        const reason = window.prompt("Why are you reporting this review?");
                        if (!reason?.trim()) return;
                        try {
                          await readResponse(await fetch(`${API_URL}/teachers/${teacher.id}/reviews/${review.id}/report`, {
                            method:"POST", headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentUser.token}`}, body:JSON.stringify({reason})
                          }));
                          alert("Review reported to the admin team.");
                        } catch (e) { alert(e.message); }
                      }}>Report review</button>
                    )}
                  </div>
                ))}

              <div className="review-form-card">
                <h3>Write a Review</h3>

                {reviewEligibility.loading ? (
                  <p>Checking review eligibility...</p>
                ) : !currentUser?.token || currentUser?.role !== "STUDENT" ? (
                  <p>Please log in with a Student account to write a review.</p>
                ) : reviewEligibility.error ? (
                  <div className="form-error">{reviewEligibility.error}</div>
                ) : reviewEligibility.alreadyReviewed ? (
                  <p>You have already reviewed this teacher. Thank you for sharing your experience!</p>
                ) : !reviewEligibility.eligible ? (
                  <p>You can write a review after this teacher approves your consultation request.</p>
                ) : (
                  <form onSubmit={submitReview}>
                    <select
                      value={reviewRating}
                      onChange={(e) => setReviewRating(Number(e.target.value))}
                      aria-label="Review rating"
                    >
                      <option value="5">5 / 5</option>
                      <option value="4">4 / 5</option>
                      <option value="3">3 / 5</option>
                      <option value="2">2 / 5</option>
                      <option value="1">1 / 5</option>
                    </select>

                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      rows="4"
                      maxLength={2000}
                      placeholder="Share your experience..."
                      required
                    />

                    <button
                      className="submit-consultation"
                      type="submit"
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? "Submitting..." : "Submit Review"}
                    </button>
                  </form>
                )}
              </div>
            </section>
          </div>

          {/* =========================
              PROFILE SIDEBAR
          ========================= */}

          <aside className="profile-sidebar">
            <div className="booking-card">
              <h2>
                Interested in this teacher?
              </h2>

              <p>
                Contact the teacher before
                making your final decision.
              </p>

              <button
                className="consultation-btn"
                onClick={() =>
                  setShowConsultation(true)
                }
              >
                Request Consultation
              </button>

              <button
                className="compare-profile-btn"
                onClick={goBack}
              >
                Compare Teacher
              </button>
            </div>

            <div className="quick-info">
              <h3>Quick Information</h3>

              {teacher.category && (
                <div>
                  <span>Category</span>
                  <strong>{teacher.category}</strong>
                </div>
              )}

              {teacher.location && (
                <div>
                  <span>Location</span>
                  <strong>{teacher.location}</strong>
                </div>
              )}

              {teacher.hourlyRate && (
                <div>
                  <span>Hourly Rate</span>
                  <strong>₩{Number(teacher.hourlyRate).toLocaleString()}</strong>
                </div>
              )}

              {teacher.lessonDuration && (
                <div>
                  <span>Lesson</span>
                  <strong>{teacher.lessonDuration}</strong>
                </div>
              )}

              {teacher.teachingMode && (
                <div>
                  <span>Mode</span>
                  <strong>{teacher.teachingMode}</strong>
                </div>
              )}

              {teacher.verified === true && (
                <div>
                  <span>Verification</span>
                  <strong>Verified teacher</strong>
                </div>
              )}
            </div></aside>
        </div>
      </div>
    </div>
  );
}

/* =========================
   MAIN APP
========================= */


function StudentProgressPanel({ user }) {
  const [items,setItems]=useState([]); const [error,setError]=useState("");
  useEffect(()=>{fetch(`${API_URL}/workspace/student/progress`,{headers:{Authorization:`Bearer ${user?.token||""}`}}).then(readResponse).then(setItems).catch(e=>setError(e.message));},[]);
  return <div className="card student-progress-panel" style={{padding:24,marginTop:20}}><div className="dashboard-card-label">YOUR GROWTH</div><h2>My Learning Progress</h2><p style={{color:"#667085"}}>Progress feedback shared by your English teacher.</p>{error&&<p style={{color:"#b42318"}}>{error}</p>}{items.length===0?<p>No progress notes yet. Your teacher's feedback will appear here.</p>:items.map(n=><article key={n.id} className="student-progress-item" style={{borderTop:"1px solid #eee",padding:"14px 0"}}><b>{n.subject}</b><p style={{whiteSpace:"pre-wrap",margin:"8px 0"}}>{n.note}</p><small style={{color:"#667085"}}>Updated {new Date(n.updatedAt).toLocaleString()}</small></article>)}</div>;
}

function TeacherToolsPanel({ user, consultations }) {
  const headers={ "Content-Type":"application/json",Authorization:`Bearer ${user?.token||""}` };
  const [notes,setNotes]=useState([]); const [slots,setSlots]=useState([]); const [analytics,setAnalytics]=useState(null); const [students,setStudents]=useState([]);
  const [studentUserId,setStudentUserId]=useState(""); const [subject,setSubject]=useState(""); const [note,setNote]=useState("");
  const [editingNoteId,setEditingNoteId]=useState(null); const [editingSubject,setEditingSubject]=useState(""); const [editingText,setEditingText]=useState("");
  const [startsAt,setStartsAt]=useState(""); const [endsAt,setEndsAt]=useState(""); const [slotNote,setSlotNote]=useState("");
  const [notice,setNotice]=useState(""); const [error,setError]=useState("");
  
  async function load(){try{const [n,a,k,st]=await Promise.all([fetch(`${API_URL}/workspace/teacher/progress`,{headers}),fetch(`${API_URL}/workspace/teacher/availability`,{headers}),fetch(`${API_URL}/workspace/teacher/analytics`,{headers}),fetch(`${API_URL}/workspace/teacher/students`,{headers})]);setNotes(await readResponse(n));setSlots(await readResponse(a));setAnalytics(await readResponse(k));setStudents(await readResponse(st));}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function saveNote(e){e.preventDefault();setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/progress`,{method:"POST",headers,body:JSON.stringify({studentUserId,subject,note})}));setSubject("");setNote("");setNotice("Student progress note saved.");await load();}catch(e){setError(e.message);}}
  async function updateProgressNote(e,id){e.preventDefault();setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/progress/${id}`,{method:"PUT",headers,body:JSON.stringify({subject:editingSubject,note:editingText})}));setEditingNoteId(null);setNotice("Progress note updated.");await load();}catch(e){setError(e.message);}}
  async function deleteProgressNote(id){if(!window.confirm("Delete this progress note?"))return;setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/progress/${id}`,{method:"DELETE",headers}));setNotice("Progress note deleted.");await load();}catch(e){setError(e.message);}}
  async function addSlot(e){e.preventDefault();setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/availability`,{method:"POST",headers,body:JSON.stringify({startsAt,endsAt,note:slotNote})}));setStartsAt("");setEndsAt("");setSlotNote("");setNotice("Availability slot added.");await load();}catch(e){setError(e.message);}}
  async function removeSlot(id){try{await readResponse(await fetch(`${API_URL}/workspace/teacher/availability/${id}`,{method:"DELETE",headers}));await load();}catch(e){setError(e.message);}}
  return <section className="teacher-tools-panel"><header className="teacher-tools-heading"><span className="eyebrow">TEACHER WORKSPACE</span><h2>Teaching Tools & Analytics</h2><p>Track learner progress and manage your teaching availability.</p></header>
    {notice&&<p style={{color:"#067647"}}>{notice}</p>}{error&&<p style={{color:"#b42318"}}>{error}</p>}
    {analytics&&<div className="teacher-analytics-grid">{[["Students",analytics.students],["Consultations",analytics.consultations],["Pending",analytics.pendingConsultations],["Lessons",analytics.lessons],["Completed",analytics.completedLessons],["Reviews",analytics.reviews],["Rating",Number(analytics.averageRating||0).toFixed(1)]].map(([k,v])=><div className="teacher-analytics-tile" key={k}><small>{k}</small><strong>{v??0}</strong></div>)}</div>}
    <div className="teacher-tools-section"><h3>Add Student Progress Note</h3><p className="section-hint">Share clear, helpful feedback after each lesson.</p>
    <form className="teacher-progress-form" onSubmit={saveNote}>
      <select required value={studentUserId} onChange={e=>setStudentUserId(e.target.value)}><option value="">Select linked student</option>{students.map(st=><option key={st.id} value={st.id}>{st.name} · {st.email}</option>)}</select>
      
      <input required maxLength="120" placeholder="Topic / subject (e.g. Phonics)" value={subject} onChange={e=>setSubject(e.target.value)}/>
      <textarea required maxLength="3000" rows="3" placeholder="Write strengths, improvement areas and homework..." value={note} onChange={e=>setNote(e.target.value)}/>
      <button className="signup-btn" disabled={!studentUserId}>Save progress note</button>
    </form>
    <div className="teacher-progress-list">{notes.map(n=><article className="teacher-progress-item" key={n.id}>
      {editingNoteId===n.id?<form onSubmit={e=>updateProgressNote(e,n.id)} style={{display:"grid",gap:8}}>
        <input required maxLength="120" aria-label="Edit progress note subject" value={editingSubject} onChange={e=>setEditingSubject(e.target.value)}/>
        <textarea required maxLength="3000" rows="3" aria-label="Edit progress note" value={editingText} onChange={e=>setEditingText(e.target.value)}/>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="signup-btn" type="submit">Save changes</button><button className="login-btn" type="button" onClick={()=>setEditingNoteId(null)}>Cancel</button></div>
      </form>:<><b>{n.subject}</b><p style={{whiteSpace:"pre-wrap"}}>{n.note}</p><small>{new Date(n.updatedAt).toLocaleString()}</small>
        <div style={{display:"flex",gap:8,marginTop:8}}><button className="login-btn" type="button" onClick={()=>{setEditingNoteId(n.id);setEditingSubject(n.subject||"");setEditingText(n.note||"");}}>Edit</button><button className="login-btn" type="button" onClick={()=>deleteProgressNote(n.id)}>Delete</button></div>
      </>}
    </article>)}</div></div>
    <div className="teacher-tools-section teacher-availability-section"><h3>Availability Calendar</h3><p className="section-hint">Choose the times students can book a consultation or lesson.</p><form className="teacher-availability-form" onSubmit={addSlot}>
      <label>Start <input required type="datetime-local" min={new Date().toISOString().slice(0,16)} value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label>
      <label>End <input required type="datetime-local" min={startsAt||new Date().toISOString().slice(0,16)} value={endsAt} onChange={e=>setEndsAt(e.target.value)}/></label>
      <input placeholder="Optional note" value={slotNote} onChange={e=>setSlotNote(e.target.value)}/>
      <button className="signup-btn">Add available time</button>
    </form>
    <div className="teacher-availability-list">{slots.map(slot=><div className="teacher-availability-item" key={slot.id}><span>{new Date(slot.startsAt).toLocaleString()} – {new Date(slot.endsAt).toLocaleString()} {slot.note}</span><button className="login-btn" onClick={()=>removeSlot(slot.id)}>Remove</button></div>)}</div></div></section>;
}

function AdminToolsPanel({ user }) {
  const headers={ "Content-Type":"application/json",Authorization:`Bearer ${user?.token||""}` };
  const [overview,setOverview]=useState(null); const [users,setUsers]=useState([]); const [reviews,setReviews]=useState([]); const [activity,setActivity]=useState([]);
  const [error,setError]=useState(""); const [notice,setNotice]=useState(""); const [reviewFilter,setReviewFilter]=useState("ALL"); const [search,setSearch]=useState("");
  async function load(){
    setError("");
    try {
      const [o,u,r,a]=await Promise.all([
        fetch(`${API_URL}/workspace/admin/overview`,{headers}),
        fetch(`${API_URL}/workspace/admin/users`,{headers}),
        fetch(`${API_URL}/workspace/admin/reviews`,{headers}),
        fetch(`${API_URL}/workspace/admin/activity`,{headers})
      ]);
      const [ov,us,rv,ac]=await Promise.all([readResponse(o),readResponse(u),readResponse(r),readResponse(a)]);
      setOverview(ov);setUsers(us);setReviews(rv);setActivity(ac);
    } catch(e){setError(e.message);}
  }
  useEffect(()=>{load();},[]);
  async function changeRole(id,role){try{await readResponse(await fetch(`${API_URL}/workspace/admin/users/${id}/role`,{method:"PATCH",headers,body:JSON.stringify({role})}));setNotice("User role updated.");await load();}catch(e){setError(e.message);}}
  async function changeStatus(id,active){try{await readResponse(await fetch(`${API_URL}/workspace/admin/users/${id}/status`,{method:"PATCH",headers,body:JSON.stringify({active})}));setNotice(active?"Account reactivated.":"Account suspended.");await load();}catch(e){setError(e.message);}}
  async function setReviewHidden(id,hidden){try{await readResponse(await fetch(`${API_URL}/workspace/admin/reviews/${id}/visibility`,{method:"PATCH",headers,body:JSON.stringify({hidden})}));setNotice(hidden?"Review hidden from public profiles.":"Review restored to public profiles.");await load();}catch(e){setError(e.message);}}
  async function removeReview(id){if(!window.confirm("Permanently remove this review? This cannot be undone."))return;try{await readResponse(await fetch(`${API_URL}/workspace/admin/reviews/${id}`,{method:"DELETE",headers}));setNotice("Review permanently removed and teacher rating recalculated.");await load();}catch(e){setError(e.message);}}
  const visibleReviews=reviews.filter(r=>(reviewFilter==="ALL"||(reviewFilter==="REPORTED"&&r.reported)||(reviewFilter==="HIDDEN"&&r.hidden)||(reviewFilter==="PUBLIC"&&!r.hidden))&&(!search.trim()||[r.teacherName,r.studentName,r.text,r.reportReason].filter(Boolean).some(v=>String(v).toLowerCase().includes(search.trim().toLowerCase()))));
  const metricLabels={users:"Total users",students:"Students",teachers:"Teachers",teacherProfiles:"Teacher profiles",consultations:"Consultations",pendingConsultations:"Pending requests",lessons:"Lessons",completedLessons:"Completed lessons",reviews:"Reviews"};
  return <div className="card" style={{padding:24,marginTop:20}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><p className="eyebrow">PLATFORM CONTROL CENTER</p><h2 style={{margin:"4px 0"}}>Platform Overview & Moderation</h2><p style={{margin:0,color:"var(--muted,#98a2b3)"}}>Monitor platform activity and keep teacher reviews trustworthy.</p></div><button type="button" className="login-btn" onClick={load}>Refresh data</button></div>
    {notice&&<p role="status" style={{color:"#12b886",marginTop:14}}>{notice}</p>}{error&&<p role="alert" style={{color:"#f97066",marginTop:14}}>{error}</p>}
    {overview&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:12,margin:"20px 0"}}>{Object.entries(metricLabels).map(([key,label])=><div key={key} style={{background:"var(--surface-2,#182235)",border:"1px solid var(--border,#29364b)",padding:15,borderRadius:14}}><small style={{color:"var(--muted,#98a2b3)"}}>{label}</small><h3 style={{margin:"6px 0 0",fontSize:25}}>{overview[key]??0}</h3></div>)}</div>}
    <section style={{marginTop:26}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><div><h3 style={{margin:"0 0 4px"}}>Review Moderation</h3><p style={{margin:0,color:"var(--muted,#98a2b3)"}}>Investigate reports, hide inappropriate content, restore valid reviews, or remove harmful reviews.</p></div><strong>{reviews.filter(r=>r.reported&&!r.hidden).length} reports pending review</strong></div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap",margin:"14px 0"}}><input aria-label="Search reviews" placeholder="Search teacher, student or review..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:"1 1 230px",minWidth:0}}/><select aria-label="Filter reviews" value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="ALL">All reviews</option><option value="REPORTED">Reported</option><option value="PUBLIC">Public</option><option value="HIDDEN">Hidden</option></select></div>
      {visibleReviews.length===0?<p style={{color:"var(--muted,#98a2b3)"}}>No reviews match this filter.</p>:visibleReviews.map(r=><article key={r.id} style={{border:"1px solid var(--border,#29364b)",background:"var(--surface-2,#182235)",borderRadius:14,padding:16,marginTop:10}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><b>{r.teacherName}</b><div style={{color:"var(--muted,#98a2b3)",fontSize:13}}>By {r.studentName} · {r.rating}/5 · {r.createdAt?new Date(r.createdAt).toLocaleDateString():"Date unavailable"}</div></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{r.reported&&<span className="status-badge status-rejected">Reported</span>}<span className="status-badge">{r.hidden?"Hidden":"Public"}</span></div></div>
        <p style={{whiteSpace:"pre-wrap",margin:"12px 0"}}>{r.text}</p>{r.reportReason&&<p style={{color:"#f97066",fontSize:13,margin:"4px 0 12px"}}><b>Report reason:</b> {r.reportReason}</p>}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" className="login-btn" onClick={()=>setReviewHidden(r.id,!r.hidden)}>{r.hidden?"Restore review":"Hide review"}</button><button type="button" className="admin-suspend-btn" onClick={()=>removeReview(r.id)}>Permanently remove</button></div>
      </article>)}
    </section>
    <section style={{marginTop:30}}><h3 style={{marginBottom:4}}>Admin Activity Overview</h3><p style={{marginTop:0,color:"var(--muted,#98a2b3)"}}>Latest consultation requests, lessons and student reviews (up to 50 records).</p>
      {activity.length===0?<p style={{color:"var(--muted,#98a2b3)"}}>No platform activity yet.</p>:<div style={{display:"grid",gap:10}}>{activity.map((item,index)=><div key={item.type+"-"+item.occurredAt+"-"+index} style={{display:"flex",gap:12,alignItems:"flex-start",padding:"12px 0",borderTop:"1px solid var(--border,#29364b)"}}><span style={{width:34,height:34,flex:"0 0 34px",display:"grid",placeItems:"center",borderRadius:10,background:"var(--surface-2,#182235)"}}>{item.type==="REVIEW"?"★":item.type==="LESSON"?"▣":"↗"}</span><div style={{flex:1,minWidth:0}}><b>{item.title}</b><div style={{fontSize:13,color:"var(--muted,#98a2b3)"}}>{item.detail}</div><small style={{color:"var(--muted,#98a2b3)"}}>{item.status} · {new Date(item.occurredAt).toLocaleString()}</small></div></div>)}</div>}
    </section>
    <section style={{marginTop:30}}><h3>User Management ({users.length})</h3>{users.map(x=><div key={x.id} style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",borderTop:"1px solid var(--border,#29364b)",padding:"12px 0",flexWrap:"wrap"}}><span><b>{x.name}</b><br/><small>{x.email}</small><br/><small className={x.active===false?"admin-account-suspended":"admin-account-active"}>{x.active===false?"Suspended":"Active"}</small></span><div className="admin-user-actions"><select aria-label={`Role for ${x.name}`} value={x.role} onChange={e=>changeRole(x.id,e.target.value)}><option>STUDENT</option><option>TEACHER</option><option>ADMIN</option></select><button type="button" className={x.active===false?"admin-reactivate-btn":"admin-suspend-btn"} disabled={x.role==="ADMIN"&&x.id===user?.id} onClick={()=>changeStatus(x.id,x.active===false)}>{x.active===false?"Reactivate":"Suspend"}</button></div></div>)}</section>
  </div>;
}

function StudentDashboard({
  currentUser,
  goToTeachers,
  handleLogout,
  onProfileUpdated,
}) {
  const [profileName, setProfileName] = useState(currentUser?.name || "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [studentDetails, setStudentDetails] = useState({ age:"", ageGroup:"", englishLevel:"", learningGoals:"", preferredCategory:"", interests:"", preferredSchedule:"", introduction:"", guardianName:"", guardianPhone:"" });
  const [studentDetailsNotice, setStudentDetailsNotice] = useState("");
  const [studentDetailsError, setStudentDetailsError] = useState("");
  const [myRequests, setMyRequests] = useState([]);
  const [requestError, setRequestError] = useState("");
  const [favoriteTeachers, setFavoriteTeachers] = useState([]);
  const [favoriteError, setFavoriteError] = useState("");
  const [myLessons, setMyLessons] = useState([]);
  const [lessonError, setLessonError] = useState("");
  const [activeOverview, setActiveOverview] = useState("");
  useEffect(() => {
    if (!currentUser?.token) return;
    fetch(`${API_URL}/lessons`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(readResponse).then(setMyLessons).catch((e) => setLessonError(e.message));
  }, [currentUser?.token]);
  useEffect(() => {
    try {
      const savedIds = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      if (!Array.isArray(savedIds) || savedIds.length === 0) return;
      fetch(`${API_URL}/teachers`)
        .then(readResponse)
        .then((data) => {
          const allTeachers = Array.isArray(data) ? data : (Array.isArray(data?.teachers) ? data.teachers : []);
          setFavoriteTeachers(allTeachers.filter((teacher) => savedIds.includes(teacher.id)));
        })
        .catch((e) => setFavoriteError(e.message));
    } catch {
      setFavoriteError("Could not load saved teachers.");
    }
  }, []);
  useEffect(() => {
    if (!currentUser?.token) return;
    fetch(`${API_URL}/workspace/student/consultations`, {
      headers: { Authorization: `Bearer ${currentUser.token}` }
    }).then(readResponse).then(setMyRequests).catch((e) => setRequestError(e.message));
  }, [currentUser?.token]);
  useEffect(() => {
    if (!currentUser?.token) return;
    fetch(`${API_URL}/workspace/student/profile`, { headers: { Authorization: `Bearer ${currentUser.token}` } })
      .then(readResponse).then((data) => setStudentDetails((old) => ({ ...old, ...data })))
      .catch((e) => setStudentDetailsError(e.message));
  }, [currentUser?.token]);
  async function saveStudentDetails(e) {
    e.preventDefault(); setStudentDetailsNotice(""); setStudentDetailsError("");
    try {
      const response = await fetch(`${API_URL}/workspace/student/profile`, {
        method:"PUT", headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentUser?.token || ""}`},
        body:JSON.stringify({ ...studentDetails, name:profileName.trim(), age:studentDetails.age ? Number(studentDetails.age) : null })
      });
      const saved = await readResponse(response);
      setStudentDetails((old)=>({...old,...saved}));
      setStudentDetailsNotice("Student learning profile saved.");
    } catch(e) { setStudentDetailsError(e.message || "Could not save student profile."); }
  }
  return (
    <main className="page student-dashboard-redesign">
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "50px 24px 80px",
        }}
      >
        <div
          style={{
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              color: "#6b7280",
              fontSize: "14px",
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Student Dashboard
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              lineHeight: 1.2,
            }}
          >
            Welcome,{" "}
            {currentUser?.name ||
              currentUser?.email ||
              "Student"}
            !
          </h1>

          <p
            style={{
              marginTop: "12px",
              color: "#6b7280",
              fontSize: "16px",
            }}
          >
            Manage your Pick My Teacher learning experience
            from one place.
          </p>
          <div className="student-hero-actions"><NotificationCenter user={currentUser} /></div>
        </div>

        <div className="student-overview-accordion" aria-label="Learning overview">
          <button type="button" className="student-overview-accordion-item student-overview-trigger" onClick={()=>setActiveOverview("lessons")}>
            <span className="overview-icon">▣</span><span className="student-overview-summary-copy"><small>UPCOMING LESSONS</small><strong>{myLessons.filter(lesson=>lesson.status==="SCHEDULED").length}</strong><span>Scheduled sessions</span></span><span className="student-overview-expand">View details <b>↗</b></span>
          </button>
          <button type="button" className="student-overview-accordion-item student-overview-trigger" onClick={()=>setActiveOverview("consultations")}>
            <span className="overview-icon">◷</span><span className="student-overview-summary-copy"><small>CONSULTATIONS</small><strong>{myRequests.length}</strong><span>Teacher requests</span></span><span className="student-overview-expand">View details <b>↗</b></span>
          </button>
          <button type="button" className="student-overview-accordion-item student-overview-trigger" onClick={()=>setActiveOverview("favorites")}>
            <span className="overview-icon">♡</span><span className="student-overview-summary-copy"><small>FAVORITE TEACHERS</small><strong>{favoriteTeachers.length}</strong><span>Saved profiles</span></span><span className="student-overview-expand">View details <b>↗</b></span>
          </button>
        </div>

        {activeOverview && <DashboardOverlay
          title={activeOverview==="lessons"?"Upcoming lessons":activeOverview==="consultations"?"Consultation requests":"Favorite teachers"}
          subtitle={activeOverview==="lessons"?"Your scheduled English learning sessions":activeOverview==="consultations"?"Track the status of your teacher requests":"Teachers you have saved for later"}
          onClose={()=>setActiveOverview("")}
        >
          {activeOverview==="lessons" && <>
            {lessonError&&<p className="student-inline-error">{lessonError}</p>}
            {myLessons.length===0?<p className="student-overview-empty">No lessons scheduled yet.</p>:myLessons.map(lesson=><div className="student-overview-table-row" key={lesson.id}>
              <div className="student-overview-row-main"><strong>{lesson.teacherName||"Your English teacher"}</strong><span>{new Date(lesson.scheduledAt).toLocaleString()} · {lesson.durationMinutes} min</span>{lesson.meetingLink&&<a className="student-join-link" href={lesson.meetingLink} target="_blank" rel="noreferrer">Join lesson ↗</a>}</div>
              <div className="student-overview-row-meta"><em className={`student-status-pill ${lesson.status==="SCHEDULED"?"is-scheduled":""}`}>{lesson.status}</em><div className="student-overview-row-actions">{lesson.status==="SCHEDULED"&&<button type="button" className="compare-btn" onClick={async()=>{if(!window.confirm("Cancel this lesson?"))return;const reason=window.prompt("Optional cancellation reason:")||"";try{await readResponse(await fetch(`${API_URL}/lessons/${lesson.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentUser.token}`},body:JSON.stringify({status:"CANCELLED",reason})}));setMyLessons(old=>old.map(x=>x.id===lesson.id?{...x,status:"CANCELLED",cancellationReason:reason}:x));}catch(e){setLessonError(e.message);}}}>Cancel lesson</button>}<button type="button" className="login-btn" onClick={async()=>{if(!window.confirm("Remove this lesson from your dashboard only?"))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/LESSON/${lesson.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setMyLessons(old=>old.filter(x=>x.id!==lesson.id));}catch(e){setLessonError(e.message);}}}>Hide</button></div></div>
            </div>)}
          </>}
          {activeOverview==="consultations" && <>
            {requestError&&<p className="student-inline-error">{requestError}</p>}
            {myRequests.length===0?<p className="student-overview-empty">No consultation requests yet.</p>:myRequests.map(r=><div className="student-overview-table-row" key={r.id}>
              <div className="student-overview-row-main"><strong>{r.teacherName||"English teacher"}</strong><span>{r.teacherCategory||"English"} · {r.preferredDate} at {r.preferredTime}</span>{r.message&&<span>{r.message}</span>}{r.status==="PENDING"&&<span>Waiting for teacher review.</span>}{r.status==="APPROVED"&&<span className="request-positive">Approved · Your teacher will arrange lesson details.</span>}{r.status==="REJECTED"&&<span className="request-negative">Not approved. {r.rejectionReason||"Please try another time."}</span>}{r.adminPreviousStatus&&<span>Admin update: {r.adminPreviousStatus} → {r.status}. {r.adminNote||""}</span>}{r.decisionHistory&&<details className="student-request-history"><summary>View request history</summary><pre>{r.decisionHistory}</pre></details>}</div>
              <div className="student-overview-row-meta"><em className={`student-status-pill ${r.status==="APPROVED"?"is-approved":r.status==="REJECTED"?"is-rejected":"is-pending"}`}>{r.status||"PENDING"}</em><button type="button" className="login-btn" onClick={async()=>{if(!window.confirm("Remove this request from your dashboard only? The teacher and admin records will remain unchanged."))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/CONSULTATION/${r.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setMyRequests(old=>old.filter(x=>x.id!==r.id));}catch(e){setRequestError(e.message);}}}>Hide</button></div>
            </div>)}
          </>}
          {activeOverview==="favorites" && <>
            {favoriteError&&<p className="student-inline-error">{favoriteError}</p>}
            {favoriteTeachers.length===0?<p className="student-overview-empty">No saved teachers yet.</p>:favoriteTeachers.map(teacher=><div className="student-overview-table-row" key={teacher.id}>
              <div className="student-overview-row-main"><strong>{teacher.name}</strong><span>{teacher.category} · {teacher.location}</span></div>
              <button className="login-btn" onClick={()=>{const next=favoriteTeachers.filter(item=>item.id!==teacher.id);setFavoriteTeachers(next);localStorage.setItem(FAVORITES_KEY,JSON.stringify(next.map(item=>item.id)));}}>Remove</button>
            </div>)}
          </>}
        </DashboardOverlay>}

        {/* Keep profile and discovery panels grouped in the dashboard grid. */}
        <div className="student-dashboard-grid">
          <div className="card student-account-card">
            <div className="dashboard-card-label">ACCOUNT</div>
            <h3>My Profile</h3>
            {profileNotice && <p style={{ color: "#067647" }}>{profileNotice}</p>}
            {profileError && <p style={{ color: "#b42318" }}>{profileError}</p>}
            <form onSubmit={async (e) => {
              e.preventDefault();
              setProfileNotice("");
              setProfileError("");
              if (!profileName.trim()) {
                setProfileError("Please enter your name.");
                return;
              }
              setProfileBusy(true);
              try {
                const response = await fetch(`${API_URL}/users/me`, {
                  method: "PUT",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentUser?.token || ""}`,
                  },
                  body: JSON.stringify({ name: profileName.trim() }),
                });
                const updated = await readResponse(response);
                onProfileUpdated?.(updated);
                setProfileName(updated.name || profileName.trim());
                setProfileNotice("Profile updated successfully.");
              } catch (err) {
                setProfileError(err.message || "Could not update your profile.");
              } finally {
                setProfileBusy(false);
              }
            }}>
              <label style={{ display: "block", marginBottom: 6 }}>Name</label>
              <input value={profileName} onChange={(e) => setProfileName(e.target.value)}
                maxLength={100} required style={{ width: "100%", marginBottom: 12 }} />
              <p><strong>Email:</strong> {currentUser?.email || "Not available"}</p>
              <p><strong>Account:</strong> Student</p>
              <button className="signup-btn" type="submit" disabled={profileBusy}>
                {profileBusy ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>

          <div className="card student-discover-card"><div className="dashboard-card-label">DISCOVER</div><h3>Find English Teachers</h3><p>Explore English teachers for speaking, phonics, grammar, reading, storytelling and school English.</p><button className="signup-btn" onClick={goToTeachers}>Find Teachers <span aria-hidden="true">→</span></button></div>

          <div className="card student-learning-card">
            <div className="dashboard-card-label">LEARNING PROFILE</div><h3>My Learning Profile</h3><p className="student-profile-intro">A few details help us recommend teachers and prepare more useful lessons.</p>
            {studentDetailsNotice&&<p className="student-inline-success">{studentDetailsNotice}</p>}{studentDetailsError&&<p className="student-inline-error">{studentDetailsError}</p>}
            <form className="student-profile-form" onSubmit={saveStudentDetails}>
              {[
                {title:"Personal details",hint:"Basic information for your learning profile.",fields:[["age","Age"],["ageGroup","Age group"],["guardianName","Parent / guardian name"],["guardianPhone","Parent / guardian phone"]]},
                {title:"Learning preferences",hint:"Your current level, goals and preferred way to learn.",fields:[["englishLevel","Current English level"],["preferredCategory","Preferred English category"],["preferredSchedule","Preferred learning schedule"],["learningGoals","Learning goals"],["interests","Interests / hobbies"]]},
                {title:"A little about you",hint:"Share anything that helps your teacher understand you.",fields:[["introduction","About me"]]}
              ].map((group,index)=><details className="student-profile-group" key={group.title}>
                <summary><span className="student-profile-step">{String(index+1).padStart(2,"0")}</span><span className="student-profile-group-copy"><strong>{group.title}</strong><small>{group.hint}</small></span><span className="student-profile-chevron">⌄</span></summary>
                <div className="student-profile-fields">{group.fields.map(([key,label])=><label key={key}>{label}{["learningGoals","interests","introduction"].includes(key)?<textarea rows={key==="introduction"?3:2} value={studentDetails[key]||""} onChange={e=>setStudentDetails(old=>({...old,[key]:e.target.value}))}/>:<input type={key==="age"?"number":"text"} value={studentDetails[key]||""} onChange={e=>setStudentDetails(old=>({...old,[key]:e.target.value}))}/>}</label>)}</div>
              </details>)}
              <div className="student-profile-submit-row"><span>Your preferences help us recommend suitable English teachers.</span><button className="signup-btn" type="submit">Save Learning Profile <span aria-hidden="true">→</span></button></div>
            </form>
          </div>
        </div>

        <StudentProgressPanel user={currentUser} />

        <div className="card student-categories-card">
          <div className="dashboard-card-label">EXPLORE</div>
          <h2>English Learning Categories</h2>
          <p>Build confidence step by step with focused English skills.</p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              marginTop: "18px",
            }}
          >
            {[
              "Kids English",
              "Phonics",
              "Speaking",
              "Reading & Writing",
              "Grammar",
              "Storytelling",
              "School English",
            ].map((category) => (
              <span
                key={category}
                className="student-category-chip"
                style={{
                  padding: "9px 14px",
                  borderRadius: "999px",
                  background: "#f3f4f6",
                  fontSize: "14px",
                  fontWeight: "600",
                }}
              >
                {category}
              </span>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: "28px",
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="signup-btn"
            onClick={goToTeachers}
          >
            Browse Teachers
          </button>

          <button
            className="login-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </section>
    </main>
 );
}


function DashboardOverlay({ title, subtitle, onClose, children }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);
  return createPortal(
    <div className="dashboard-overlay-backdrop" onMouseDown={(event)=>{if(event.target===event.currentTarget)onClose();}}>
      <section className="dashboard-overlay-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header className="dashboard-overlay-header">
          <div><span className="dashboard-overlay-eyebrow">PICK MY TEACHER</span><h2>{title}</h2><p>{subtitle}</p></div>
          <button type="button" className="dashboard-overlay-close" onClick={onClose} aria-label="Close panel">×</button>
        </header>
        <div className="dashboard-overlay-content">{children}</div>
      </section>
    </div>,
    document.body
  );
}

function NotificationCenter({ user }) {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    if (!user?.token) return;
    try {
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await readResponse(response);
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnread(Number(data?.unreadCount || 0));
      setError("");
    } catch (e) { setError(e.message || "Could not load notifications."); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [user?.token]);
  async function markRead(id) {
    try {
      await readResponse(await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  async function markAllRead() {
    try {
      await readResponse(await fetch(`${API_URL}/notifications/read-all`, {
        method: "PATCH", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  async function deleteOne(id) {
    if (!window.confirm("Delete this notification?")) return;
    try {
      await readResponse(await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  async function deleteAll() {
    if (!items.length || !window.confirm("Delete all your notifications? This cannot be undone.")) return;
    try {
      await readResponse(await fetch(`${API_URL}/notifications`, {
        method: "DELETE", headers: { Authorization: `Bearer ${user?.token || ""}` }
      }));
      await load();
    } catch (e) { setError(e.message); }
  }
  return <div className="notification-center">
    <button type="button" className="login-btn" onClick={() => { setOpen(v => !v); if (!open) load(); }}
      aria-expanded={open} aria-label={`Notifications, ${unread} unread`}>
      <span className="notification-bell-mark">♢</span><span>Notifications</span>{unread > 0 && <span className="notification-count">{unread > 99 ? "99+" : unread}</span>}
    </button>
    {open && <DashboardOverlay title="Notifications" subtitle={`${unread} unread · Your latest account updates`} onClose={()=>setOpen(false)}>
      <div className="notification-panel">
        <div className="notification-panel-heading">
          <div><strong>Recent activity</strong><small>{unread} unread</small></div>
          <div className="notification-actions">
            <button type="button" onClick={markAllRead} disabled={!unread}>Read all</button>
            <button type="button" onClick={deleteAll} disabled={!items.length}>Delete all</button>
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        {loading && !items.length && <div className="notification-empty">Loading your notifications…</div>}
        {!loading && !items.length && !error && <div className="notification-empty">You’re all caught up. No notifications yet.</div>}
        {items.map(item => <div key={item.id} className={`notification-item ${item.read ? "is-read" : "is-unread"}`}>
          <button type="button" className="notification-content" onClick={() => !item.read && markRead(item.id)}>
            <strong>{item.title}</strong><span>{item.message}</span>
            <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""} · {item.read ? "Read" : "Unread"}</small>
          </button>
          <button type="button" className="notification-delete" onClick={() => deleteOne(item.id)} aria-label={`Delete notification: ${item.title}`}>Delete</button>
        </div>)}
      </div>
    </DashboardOverlay>}
  </div>;
}

function WorkspaceShell({ title, subtitle, user, onLogout, children }) {
  return (
    <main className="workspace-premium-shell" style={{ minHeight: "75vh", background: "#f5f7fb", padding: "42px 20px" }}>
      <section style={{ maxWidth: 1080, margin: "0 auto" }}>
        <div className="workspace-premium-heading">
          <div className="workspace-heading-copy">
            <p className="workspace-eyebrow">PICK MY TEACHER · WORKSPACE</p>
            <h1>{title}</h1>
            <p className="workspace-subtitle">{subtitle} · {user?.email}</p>
          </div>
          <div className="workspace-heading-actions">
            <NotificationCenter user={user} />
            <button className="login-btn" onClick={onLogout}>Log out</button>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}

function getYouTubeVideoId(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\\./, "");
    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] || "";
    if (host === "youtube.com") {
      if (url.pathname === "/watch") return url.searchParams.get("v") || "";
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" || parts[0] === "shorts") return parts[1] || "";
    }
  } catch (e) {}
  return "";
}

function TeacherWorkspace({ currentUser, handleLogout }) {
  const [profile, setProfile] = useState({ category: "Kids English", location: "Online", specialty: "", experience: "", teachingStyle: "Supportive & Interactive", qualification: "", bio: "", hourlyRate: "", lessonDuration: "30", languages: "English", ageRange: "Children", teachingMode: "Online", availability: "" });
  const [profileImage, setProfileImage] = useState(null);
  const [qualificationFile, setQualificationFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videos, setVideos] = useState([]);
  const [consultations, setConsultations] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [lessonDrafts, setLessonDrafts] = useState({});
  const [lessonNotice, setLessonNotice] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoMode, setVideoMode] = useState("youtube");
  const [videoFile, setVideoFile] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token || ""}` };

  async function load() {
    try {
      const [p, v, c] = await Promise.all([
        fetch(`${API_URL}/workspace/teacher/profile`, { headers }),
        fetch(`${API_URL}/workspace/teacher/videos`, { headers }),
        fetch(`${API_URL}/workspace/teacher/consultations`, { headers })
      ]);
      const pd = await readResponse(p);
      if (pd && pd.profile !== "NOT_CREATED") setProfile(old => ({ ...old, ...pd }));
      setVideos(await readResponse(v));
      setConsultations(await readResponse(c));
      const lessonResponse = await fetch(`${API_URL}/lessons`, { headers });
      setLessons(await readResponse(lessonResponse));
    } catch (e) { setError(e.message); }
  }
  useEffect(() => { load(); }, []);
  function change(e) { setProfile(p => ({ ...p, [e.target.name]: e.target.value })); }
  async function saveProfile(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice("");
    try {
      let nextProfile = { ...profile };
      if (qualificationFile) {
        const allowed = ["application/pdf", "image/jpeg", "image/png"];
        if (!allowed.includes(qualificationFile.type) || qualificationFile.size > 10 * 1024 * 1024) throw new Error("Upload a PDF, JPG or PNG document under 10 MB.");
        const signed = await readResponse(await fetch(`${API_URL}/workspace/teacher/qualification-document/sign`, { method: "POST", headers }));
        const form = new FormData();
        form.append("file", qualificationFile); form.append("api_key", signed.apiKey); form.append("timestamp", String(signed.timestamp));
        form.append("public_id", signed.publicId); form.append("overwrite", "true"); form.append("signature", signed.signature);
        const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/raw/upload`, { method: "POST", body: form });
        const documentData = await readResponse(uploaded); nextProfile.qualificationDocumentUrl = documentData.secure_url;
      }
      if (profileImage) {
        if (!profileImage.type.startsWith("image/") || profileImage.size > 5 * 1024 * 1024) throw new Error("Choose an image under 5 MB.");
        const signed = await readResponse(await fetch(`${API_URL}/workspace/teacher/profile-image/sign`, { method: "POST", headers }));
        const form = new FormData();
        form.append("file", profileImage);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("public_id", signed.publicId);
        form.append("overwrite", "true");
        form.append("signature", signed.signature);
        const uploaded = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body: form });
        const imageData = await readResponse(uploaded);
        nextProfile.profileImageUrl = imageData.secure_url;
      }
      const requiredFields = [
        ["specialty", "teaching specialty"],
        ["experience", "teaching experience"],
        ["qualification", "qualifications"],
        ["bio", "teaching introduction"],
        ["hourlyRate", "hourly rate"],
        ["languages", "languages"],
        ["ageRange", "student age range"],
        ["teachingMode", "teaching mode"],
        ["availability", "weekly availability"]
      ];
      const missing = requiredFields.find(([key]) => !String(nextProfile[key] ?? "").trim());
      if (missing) throw new Error(`Please add your ${missing[1]} before submitting.`);
      if (!Number.isFinite(Number(nextProfile.hourlyRate)) || Number(nextProfile.hourlyRate) <= 0) throw new Error("Enter a valid hourly rate greater than zero.");
      if (!Number.isFinite(Number(nextProfile.lessonDuration)) || Number(nextProfile.lessonDuration) < 15) throw new Error("Lesson duration must be at least 15 minutes.");
      const res = await fetch(`${API_URL}/workspace/teacher/profile`, { method: "PUT", headers, body: JSON.stringify({ ...nextProfile, hourlyRate: Number(nextProfile.hourlyRate), lessonDuration: Number(nextProfile.lessonDuration) }) });
      const savedProfile = await readResponse(res);
      setProfile(old => ({ ...old, ...savedProfile }));
      setProfileImage(null);
      setNotice("Application submitted. Your profile is now waiting for admin verification.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function updateConsultationStatus(id, status) {
    let rejectionReason = "";
    if (status === "REJECTED") {
      rejectionReason = window.prompt("Please explain why you are rejecting this request (this will be shared with the student):") || "";
      if (!rejectionReason.trim()) return;
    }
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/workspace/teacher/consultations/${id}/status`, {
        method: "PATCH", headers, body: JSON.stringify({ status, rejectionReason })
      });
      await readResponse(response);
      setNotice(status === "APPROVED" ? "Consultation request approved." : "Consultation request rejected.");
      await load();
    } catch (e) { setError(e.message || "Could not update consultation request."); }
    finally { setBusy(false); }
  }
  async function scheduleLesson(consultation) {
    const draft = lessonDrafts[consultation.id] || {};
    if (!draft.scheduledAt) { setError("Please choose both a lesson date and time."); return; }
    const selectedDate = new Date(draft.scheduledAt);
    if (Number.isNaN(selectedDate.getTime()) || selectedDate <= new Date()) { setError("Choose a lesson date and time in the future."); return; }
    const durationMinutes = Number(draft.durationMinutes || 30);
    if (!Number.isFinite(durationMinutes) || durationMinutes < 15 || durationMinutes > 180) { setError("Lesson duration must be between 15 and 180 minutes."); return; }
    setBusy(true); setError(""); setLessonNotice("");
    try {
      const response = await fetch(`${API_URL}/lessons/from-consultation/${consultation.id}`, { method:"POST", headers, body:JSON.stringify({ scheduledAt:draft.scheduledAt, durationMinutes, meetingLink:draft.meetingLink || "", notes:draft.notes || "" }) });
      await readResponse(response);
      setLessonNotice("Lesson scheduled successfully. The student has been notified.");
      await load();
    } catch(e) { setError(e.message || "Could not schedule this lesson. Please check the date and try again."); }
    finally { setBusy(false); }
  }
  async function updateLesson(id, status) {
    setBusy(true); setError(""); setLessonNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/lessons/${id}/status`, { method:"PATCH", headers, body:JSON.stringify({status}) }));
      setLessonNotice(status === "COMPLETED" ? "Lesson marked completed." : "Lesson cancelled.");
      await load();
    } catch(e) { setError(e.message || "Could not update lesson."); }
    finally { setBusy(false); }
  }
  async function rescheduleLesson(lesson) {
    const value=window.prompt("Enter new date and time (YYYY-MM-DDTHH:mm):", lesson.scheduledAt?.slice(0,16) || "");
    if(!value) return;
    setBusy(true); setError(""); setLessonNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/lessons/${lesson.id}/reschedule`, {method:"PATCH",headers,body:JSON.stringify({scheduledAt:value})}));
      setLessonNotice("Lesson rescheduled."); await load();
    } catch(e) { setError(e.message || "Could not reschedule lesson."); }
    finally { setBusy(false); }
  }
  async function addVideo(e) {
    e.preventDefault(); setBusy(true); setError(""); setNotice(""); setVideoUploadProgress(0);
    try {
      let finalUrl = videoUrl.trim();
      let finalType = "youtube";
      if (videoMode === "upload") {
        if (!videoFile) throw new Error("Choose a video file from your device.");
        const allowed = ["video/mp4", "video/webm", "video/quicktime"];
        if (!allowed.includes(videoFile.type)) throw new Error("Choose an MP4, WebM or MOV video.");
        if (videoFile.size > 100 * 1024 * 1024) throw new Error("Video must be 100 MB or smaller.");
        const signed = await readResponse(await fetch(`${API_URL}/workspace/teacher/demo-video/sign`, { method: "POST", headers }));
        const form = new FormData();
        form.append("file", videoFile);
        form.append("api_key", signed.apiKey);
        form.append("timestamp", String(signed.timestamp));
        form.append("public_id", signed.publicId);
        form.append("signature", signed.signature);
        const uploaded = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `https://api.cloudinary.com/v1_1/${signed.cloudName}/video/upload`);
          xhr.upload.onprogress = event => {
            if (event.lengthComputable) setVideoUploadProgress(Math.round((event.loaded / event.total) * 100));
          };
          xhr.onload = () => {
            let data = {};
            try { data = JSON.parse(xhr.responseText || "{}"); } catch {}
            if (xhr.status >= 200 && xhr.status < 300) resolve(data);
            else reject(new Error(data.error?.message || "Video upload failed. Check your Cloudinary video upload limits."));
          };
          xhr.onerror = () => reject(new Error("Network error while uploading the video."));
          xhr.send(form);
        });
        if (!uploaded.secure_url) throw new Error("Cloudinary did not return a playable video URL.");
        finalUrl = uploaded.secure_url;
        finalType = "uploaded";
      } else if (!finalUrl) {
        throw new Error("Enter a YouTube video link.");
      }
      const res = await fetch(`${API_URL}/workspace/teacher/videos`, {
        method: "POST", headers,
        body: JSON.stringify({ title: videoTitle, videoUrl: finalUrl, videoType: finalType })
      });
      await readResponse(res);
      setVideoTitle(""); setVideoUrl(""); setVideoFile(null); setVideoUploadProgress(0);
      setNotice("Demo video added."); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); setVideoUploadProgress(0); }
  }

  async function deleteVideo(id) {
    if (!window.confirm("Delete this demo video?")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const res = await fetch(`${API_URL}/workspace/teacher/videos/${id}`, { method: "DELETE", headers });
      await readResponse(res);
      setVideos(current => current.filter(video => String(video.id) !== String(id)));
      setNotice("Demo video deleted.");
      await load();
    } catch (e) {
      setError(e.message || "Could not delete demo video.");
    } finally {
      setBusy(false);
    }
  }
  return <div className="teacher-dashboard-redesign"><WorkspaceShell title="Teacher Dashboard" subtitle="Manage your teaching profile and demo lessons" user={currentUser} onLogout={handleLogout}>
    {notice && <p style={{ background: "#ecfdf3", color: "#067647", padding: 12, borderRadius: 10 }}>{notice}</p>}
    {lessonNotice && <p style={{background:"#ecfdf3",color:"#067647",padding:12,borderRadius:10}}>{lessonNotice}</p>}
    {error && <p style={{ background: "#fef3f2", color: "#b42318", padding: 12, borderRadius: 10 }}>{error}</p>}
    {!profile.verified && <div className="card teacher-application-status" style={{padding:20,marginBottom:18,border:"1px solid #42577b",background:"#17243b",color:"#e8eefc"}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:".12em",color:"#a9b9e8"}}>APPLICATION STATUS</div>
      <h2 style={{margin:"8px 0",color:"#f4f7ff"}}>{!profile.id ? "Complete your teacher application" : profile.available === false ? "Application needs attention" : "Waiting for admin verification"}</h2>
      <p style={{margin:0,color:"#c3cde2",lineHeight:1.65}}>{!profile.id ? "Complete the profile form below and submit it for review. Your public teacher listing will appear only after approval." : profile.available === false ? "Your previous application was not approved. Update your profile and submit it again for a new review." : "Your application has been received. You can edit your details while it is under review. Your public profile and teaching tools unlock after approval."}</p>
    </div>}
    <div className="teacher-dashboard-main-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20 }}>
      <form className="card teacher-profile-form" onSubmit={saveProfile}>
        <div className="teacher-form-heading">
          <div><span className="teacher-form-kicker">YOUR PUBLIC LISTING</span><h2>My Teacher Profile</h2><p>Keep your teaching details clear and up to date.</p></div>
          <span className="teacher-form-step">PROFILE</span>
        </div>
        <div className="teacher-profile-photo-field">
          <div className="teacher-photo-preview">{(imagePreview || profile.profileImageUrl) ? <img src={imagePreview || profile.profileImageUrl} alt="Teacher profile preview" /> : <span>✦</span>}</div>
          <div className="teacher-photo-copy"><label>Profile picture</label><input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setProfileImage(f);setImagePreview(URL.createObjectURL(f));}}} /><small>JPG, PNG or WebP · maximum 5 MB</small></div>
        </div>
        <div className="teacher-profile-fields">
          <label>Teaching category<select name="category" value={profile.category} onChange={change}>{["Kids English","Phonics","Speaking","Reading & Writing","Grammar","Storytelling","School English"].map(x=><option key={x}>{x}</option>)}</select></label>
          {[
            ["location","Location / Online"],["specialty","Specialty"],["experience","Teaching experience"],["teachingStyle","Teaching style"],["qualification","Qualifications"],["bio","About your teaching"],["hourlyRate","Hourly rate"],["lessonDuration","Lesson duration (minutes)"],["languages","Languages"],["ageRange","Student age range"],["teachingMode","Teaching mode"],["availability","Availability"]
          ].map(([key,label])=><label key={key} className={["bio","qualification","availability"].includes(key)?"teacher-field-wide":""}>{label}{key==="bio" || key==="qualification" || key==="availability" ? <textarea name={key} value={profile[key] || ""} onChange={change} rows={key==="bio"?3:2} /> : <input name={key} type={key==="hourlyRate"||key==="lessonDuration"?"number":"text"} value={profile[key] ?? ""} onChange={change} />}</label>)}
          <label className="teacher-field-wide">Issuing institution / certificate provider
            <input name="qualificationInstitution" value={profile.qualificationInstitution || ""} onChange={change} placeholder="e.g. University or certification body" />
          </label>
          <label className="teacher-field-wide">Qualification evidence <span className="teacher-field-hint">PDF, JPG or PNG · max 10 MB</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>setQualificationFile(e.target.files?.[0] || null)} />
          </label>
        </div>
        {profile.qualificationDocumentUrl && <p className="teacher-current-document">Current document: <a href={profile.qualificationDocumentUrl} target="_blank" rel="noreferrer">View uploaded evidence</a></p>}
        <p className="teacher-privacy-note">Upload a teaching certificate or relevant degree. Do not upload passports or unrelated identity documents.</p>
        <div className="teacher-profile-footer"><span>Changes are saved to your teacher profile.</span><button className="signup-btn" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button></div>
      </form>
      {profile.verified && <div className="teacher-tools-stack" style={{ display:"grid", gap:20, alignContent:"start" }}>
        <form className="card teacher-demo-card" onSubmit={addVideo} style={{ padding:24 }}>
          <h2>Demo Videos ({videos.length}/2)</h2>
          <p style={{ color:"#9aa6bd", lineHeight:1.6 }}>Share up to two teaching demos. Paste a YouTube link or upload a video directly from your device.</p>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"14px 0"}}>
            <button type="button" className={videoMode==="youtube"?"signup-btn":"login-btn"} onClick={()=>setVideoMode("youtube")}>YouTube link</button>
            <button type="button" className={videoMode==="upload"?"signup-btn":"login-btn"} onClick={()=>setVideoMode("upload")}>Upload from device</button>
          </div>
          <label>Video title</label><input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} required style={{ width:"100%", margin:"6px 0 12px" }} />
          {videoMode==="youtube" ? <>
            <label>YouTube URL</label><input type="url" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required style={{ width:"100%", margin:"6px 0 12px" }} />
          </> : <>
            <label>Choose video file (MP4, WebM or MOV · max 100 MB)</label>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={e=>setVideoFile(e.target.files?.[0] || null)} required style={{display:"block",width:"100%",margin:"8px 0 10px"}} />
            {videoFile && <p style={{fontSize:13,color:"#9aa6bd"}}>{videoFile.name} · {(videoFile.size/1024/1024).toFixed(1)} MB</p>}
            {busy && <div style={{height:7,background:"#26334a",borderRadius:99,overflow:"hidden",margin:"10px 0"}}><div style={{height:"100%",width:videoUploadProgress+"%",background:"#8b9cff",transition:"width .2s"}} /></div>}
            {busy && <p style={{fontSize:12,color:"#9aa6bd"}}>Uploading video… {videoUploadProgress}%</p>}
          </>}
          <p style={{fontSize:12,color:"#9aa6bd",lineHeight:1.6}}>Upload only your own teaching demonstration. Video upload availability and maximum file size are subject to your Cloudinary account limits.</p>
          <button className="signup-btn" disabled={busy || videos.length>=2}>{videos.length>=2?"Two videos added":busy?(videoMode==="upload"?"Uploading...":"Saving..."):"Add demo video"}</button>
          {videos.map(v=>{const videoId=getYouTubeVideoId(v.videoUrl);const isUploaded=v.videoType==="uploaded";return <div key={v.id} style={{padding:"12px 0",borderTop:"1px solid #334155"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><p style={{margin:"0 0 10px"}}><a href={v.videoUrl} target="_blank" rel="noreferrer">{v.title}</a> <small style={{color:"#9aa6bd"}}>{isUploaded?"· Uploaded video":"· YouTube"}</small></p><button type="button" disabled={busy} onClick={()=>deleteVideo(v.id)} style={{background:"transparent",color:"#fda29b",border:"1px solid #b54745",borderRadius:8,padding:"7px 12px",fontWeight:600,cursor:"pointer"}}>Delete</button></div>{isUploaded ? <video controls playsInline preload="metadata" src={v.videoUrl} style={{width:"100%",aspectRatio:"16 / 9",borderRadius:12,background:"#080d18"}} /> : videoId ? <iframe title={v.title} src={"https://www.youtube.com/embed/"+videoId} style={{width:"100%",aspectRatio:"16 / 9",border:0,borderRadius:12}} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <p style={{color:"#9aa6bd"}}>Preview is unavailable for this link. <a href={v.videoUrl} target="_blank" rel="noreferrer">Watch video</a></p>}</div>})}
        </form>
        <div className="card teacher-lessons-card" style={{ padding:24 }}>
          <h2>Lesson Calendar & Management</h2>
          {lessons.length===0 ? <p style={{color:"#667085"}}>Scheduled lessons will appear here.</p> : lessons.map(lesson=><div key={lesson.id} style={{borderTop:"1px solid #eee",padding:"12px 0"}}>
            <b>{lesson.studentName}</b><p>{new Date(lesson.scheduledAt).toLocaleString()} · {lesson.durationMinutes} min · <strong>{lesson.status}</strong></p>
            {lesson.meetingLink && <p><a href={lesson.meetingLink} target="_blank" rel="noreferrer">Meeting link</a></p>}
            {<div style={{marginTop:8}}><button type="button" className="login-btn" disabled={busy} onClick={async()=>{if(!window.confirm("Remove this lesson from your dashboard only?"))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/LESSON/${lesson.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setLessons(old=>old.filter(x=>x.id!==lesson.id));}catch(e){setError(e.message);}}}>Remove from my dashboard</button></div>}{lesson.status==="SCHEDULED" && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button type="button" className="login-btn" disabled={busy} onClick={()=>rescheduleLesson(lesson)}>Reschedule</button>
              <button type="button" className="signup-btn" disabled={busy} onClick={()=>updateLesson(lesson.id,"COMPLETED")}>Mark completed</button>
              <button type="button" disabled={busy} onClick={()=>updateLesson(lesson.id,"CANCELLED")}>Cancel</button>
            </div>}
          </div>)}
        </div>
        <div className="card teacher-requests-card" style={{ padding:24 }}>
          <h2>Demo Class Requests</h2>
          {consultations.length===0 ? <p style={{color:"#667085"}}>No requests yet.</p> : consultations.map(c=><div key={c.id} style={{borderTop:"1px solid #eee",padding:"12px 0"}}><b>{c.studentName}</b><p>{c.preferredDate} · {c.preferredTime} · <strong>{c.status}</strong></p><p>{c.message}</p><button type="button" className="login-btn" onClick={()=>setSelectedStudent(selectedStudent===c.id?null:c.id)}>{selectedStudent===c.id?"Hide":"View"} Student Profile</button>{selectedStudent===c.id && <div className="teacher-student-profile" style={{background:"#f8fafc",padding:12,borderRadius:10,marginTop:8}}><p><b>Email:</b> {c.studentProfile?.email || c.email}</p><p><b>Age / Group:</b> {c.studentProfile?.age || "—"} / {c.studentProfile?.ageGroup || "—"}</p><p><b>English Level:</b> {c.studentProfile?.englishLevel || "—"}</p><p><b>Learning Goals:</b> {c.studentProfile?.learningGoals || "—"}</p><p><b>Preferred Category:</b> {c.studentProfile?.preferredCategory || "—"}</p><p><b>Interests:</b> {c.studentProfile?.interests || "—"}</p><p><b>Schedule:</b> {c.studentProfile?.preferredSchedule || "—"}</p><p><b>About:</b> {c.studentProfile?.introduction || "—"}</p>{c.studentProfile?.guardianName && <p><b>Guardian:</b> {c.studentProfile.guardianName} · {c.studentProfile.guardianPhone}</p>}</div>}{c.rejectionReason && <p style={{color:"#b42318"}}><b>Teacher rejection reason:</b> {c.rejectionReason}</p>}{c.adminPreviousStatus && <p><b>Admin changed status:</b> {c.adminPreviousStatus} → {c.status} {c.adminNote || ""}</p>}{c.decisionHistory && <p style={{whiteSpace:"pre-line"}}><b>Decision History:</b>{"\\n"}{c.decisionHistory}</p>}<div style={{marginTop:8}}><button type="button" className="login-btn" onClick={async()=>{if(!window.confirm("Remove this consultation from your dashboard only?"))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/CONSULTATION/${c.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setConsultations(old=>old.filter(x=>x.id!==c.id));}catch(e){setError(e.message);}}}>Remove from my dashboard</button></div>{c.status==="PENDING" && <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button type="button" className="signup-btn" disabled={busy} onClick={()=>updateConsultationStatus(c.id,"APPROVED")}>Approve</button><button type="button" disabled={busy} onClick={()=>updateConsultationStatus(c.id,"REJECTED")} style={{background:"#fff",color:"#b42318",border:"1px solid #fda29b",borderRadius:10,padding:"10px 16px",fontWeight:600,cursor:"pointer"}}>Reject</button></div>}
            {c.status==="APPROVED" && !lessons.some(l=>l.consultationId===c.id) && <div className="lesson-scheduler" style={{marginTop:12}}>
              <h4>Schedule first lesson</h4>
              <label>Date & time <input className="lesson-schedule-datetime" type="datetime-local" required step="900" min={new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16)} value={lessonDrafts[c.id]?.scheduledAt||""} onChange={e=>{setError("");setLessonDrafts(old=>({...old,[c.id]:{...old[c.id],scheduledAt:e.target.value}}));}} /></label>
              <label>Duration <select value={lessonDrafts[c.id]?.durationMinutes||30} onChange={e=>setLessonDrafts(old=>({...old,[c.id]:{...old[c.id],durationMinutes:e.target.value}}))}><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option><option value="90">90 minutes</option></select></label>
              <label>Meeting link (optional) <input type="url" placeholder="https://..." value={lessonDrafts[c.id]?.meetingLink||""} onChange={e=>setLessonDrafts(old=>({...old,[c.id]:{...old[c.id],meetingLink:e.target.value}}))}/></label>
              {error && <p className="lesson-scheduler-message error" role="alert">{error}</p>}
              {lessonNotice && <p className="lesson-scheduler-message success" role="status">{lessonNotice}</p>}
              <button type="button" className="signup-btn" disabled={busy} style={{marginTop:10}} onClick={()=>scheduleLesson(c)}>{busy?"Scheduling...":"Schedule lesson"}</button>
            </div>}</div>)}
        </div>
      </div>}
    </div>
  {profile.verified && <TeacherToolsPanel user={currentUser} consultations={consultations} />}
  </WorkspaceShell></div>;
}

function AdminWorkspace({ currentUser, handleLogout }) {
  const [teachers, setTeachers] = useState([]);
  const [allTeachers, setAllTeachers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [consultationSearch, setConsultationSearch] = useState("");
  const [consultationFilter, setConsultationFilter] = useState("ALL");
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token || ""}` };
  async function load() {
    try {
      const [t,c,all] = await Promise.all([
        fetch(`${API_URL}/workspace/admin/pending-teachers`, { headers }),
        fetch(`${API_URL}/workspace/admin/consultations`, { headers }),
        fetch(`${API_URL}/workspace/admin/teachers`, { headers })
      ]);
      setTeachers(await readResponse(t)); setConsultations(await readResponse(c)); setAllTeachers(await readResponse(all));
    } catch(e) { setError(e.message); }
  }
  useEffect(()=>{load();},[]);
  const filteredConsultations = consultations.filter((item) => {
    const matchesStatus = consultationFilter === "ALL" || item.status === consultationFilter;
    const term = consultationSearch.trim().toLowerCase();
    const matchesSearch = !term || [item.studentName, item.email, item.teacherName, item.status]
      .filter(Boolean).some((value) => String(value).toLowerCase().includes(term));
    return matchesStatus && matchesSearch;
  });
  const consultationCounts = consultations.reduce((counts, item) => {
    const key = item.status || "UNKNOWN";
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});

  async function approve(id) {
    setError(""); setNotice("");
    try { await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${id}/approve`,{method:"POST",headers})); setNotice("Teacher approved."); await load(); }
    catch(e){setError(e.message);}
  }
  async function reject(id) {
    setError(""); setNotice("");
    if (!window.confirm("Reject this teacher application? The profile will be hidden, not deleted.")) return;
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${id}/reject`,{method:"POST",headers}));
      setNotice("Teacher application rejected and hidden.");
      await load();
    } catch(e) { setError(e.message); }
  }
  async function removeTeacherProfile(teacher) {
    const confirmation = window.prompt(`This removes ${teacher.name}'s public teacher profile while preserving the account and history. Type REMOVE to confirm:`);
    if (confirmation !== "REMOVE") return;
    setError(""); setNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${teacher.id}`, { method:"DELETE", headers }));
      setNotice(`${teacher.name}'s public teacher profile was removed. Account and history were preserved.`);
      await load();
    } catch(e) { setError(e.message || "Could not remove teacher profile."); }
  }

  async function restoreTeacherProfile(teacher) {
    if (!window.confirm(`Restore ${teacher.name}'s public profile and make it visible to students again?`)) return;
    setError(""); setNotice("");
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${teacher.id}/restore`, { method:"POST", headers }));
      setNotice(`${teacher.name}'s public teacher profile was restored and published.`);
      await load();
    } catch(e) { setError(e.message || "Could not restore teacher profile."); }
  }
  async function setStatus(id,status) {
    const adminNote = window.prompt("Optional admin note explaining this status update:") || "";
    try {
      await readResponse(await fetch(`${API_URL}/workspace/admin/consultations/${id}/status`,{method:"PATCH",headers,body:JSON.stringify({status,adminNote})}));
      setNotice("Consultation status updated. Previous decision is retained in history.");
      await load();
    } catch(e){setError(e.message);}
  }
  return <div className="admin-dashboard-redesign"><WorkspaceShell title="Admin Dashboard" subtitle="Review teacher applications and manage requests" user={currentUser} onLogout={handleLogout}>
    {notice&&<p style={{background:"#ecfdf3",color:"#067647",padding:12,borderRadius:10}}>{notice}</p>}
    {error&&<p style={{background:"#fef3f2",color:"#b42318",padding:12,borderRadius:10}}>{error}</p>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginBottom:20}}>
      {[["Pending teachers",teachers.length],["Total consultations",consultations.length],["Pending",consultationCounts.PENDING||0],["Approved",consultationCounts.APPROVED||0],["Completed",consultationCounts.COMPLETED||0]].map(([label,value])=><div className="card" key={label} style={{padding:18}}><p style={{color:"#667085",fontSize:13,margin:0}}>{label}</p><strong style={{fontSize:28}}>{value}</strong></div>)}
    </div>
    <div className="card" style={{padding:24,marginBottom:20}}>
      <h2>Teacher Verification ({teachers.length})</h2>
      {teachers.length===0?<p style={{color:"#667085"}}>No pending teacher applications.</p>:teachers.map(t=><div key={t.id} style={{borderTop:"1px solid #eee",padding:"16px 0",display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
        <div style={{flex:"1 1 420px"}}><b>{t.name}</b><p>{t.category} · {t.location} · {t.experience}</p><p><b>Qualification:</b> {t.qualification}</p><p><b>Institution:</b> {t.qualificationInstitution || "Not provided"}</p><p>{t.bio}</p><p><b>Evidence:</b> {t.qualificationDocumentUrl ? <a href={t.qualificationDocumentUrl} target="_blank" rel="noreferrer">Open certificate / degree</a> : "Not uploaded — request evidence before approval."}</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{(t.videos || []).map(v=><a key={v.id} href={v.videoUrl} target="_blank" rel="noreferrer">Demo: {v.title}</a>)}</div><p style={{fontSize:12,color:"#667085"}}>Review the document name and issuing institution, and assess the demo lesson before approval. Uploaded files are evidence, not automatic proof of authenticity.</p></div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button className="signup-btn" onClick={()=>approve(t.id)}>Approve teacher</button>
          <button className="login-btn" onClick={()=>reject(t.id)} style={{color:"#b42318"}}>Reject</button>
        </div>
      </div>)}
    </div>
    <div className="card admin-teacher-management" style={{padding:24,marginBottom:20}}>
      <div className="admin-section-heading"><div><p className="eyebrow">ACCOUNT OVERSIGHT</p><h2>Teacher Profile Management</h2><p>Manage public teacher listings without deleting account or lesson history.</p></div><span>{allTeachers.length} profiles</span></div>
      {allTeachers.length===0?<p className="empty-state">No teacher profiles found.</p>:allTeachers.map(t=><div className="admin-teacher-row" key={t.id}>
        <div><strong>{t.name}</strong><p>{t.category} · {t.location} · {t.experience}</p><small>{t.ownerEmail || "No linked email"}</small></div>
        <div className="admin-teacher-meta"><span className={t.verified && t.available ? "status-pill status-active" : "status-pill"}>{t.verified && t.available ? "Published" : t.available ? "Pending" : "Hidden"}</span>
        {t.available
          ? <button type="button" className="danger-outline-btn" onClick={()=>removeTeacherProfile(t)}>Remove profile</button>
          : <button type="button" className="signup-btn" onClick={()=>restoreTeacherProfile(t)}>Restore profile</button>}
        </div>
      </div>)}
    </div>
    <section className="admin-consultations-panel">
      <div className="admin-consultations-heading">
        <div><p className="eyebrow">STUDENT & TEACHER ACTIVITY</p><h2>Consultation Requests</h2><p>Review requests, inspect student profiles and manage each decision.</p></div>
        <span className="admin-total-count">{filteredConsultations.length} of {consultations.length} requests</span>
      </div>
      <div className="admin-consultation-filters">
        <input aria-label="Search consultations" placeholder="Search student, email or teacher..." value={consultationSearch} onChange={e=>setConsultationSearch(e.target.value)} />
        <select aria-label="Filter consultation status" value={consultationFilter} onChange={e=>setConsultationFilter(e.target.value)}>
          {["ALL","PENDING","APPROVED","REJECTED","COMPLETED"].map(status=><option key={status} value={status}>{status==="ALL"?"All statuses":status}</option>)}
        </select>
      </div>
      <div className="admin-consultation-list">
        {filteredConsultations.length===0?<div className="admin-empty-state"><span>✦</span><strong>No matching requests</strong><p>Try changing your search or status filter.</p></div>:filteredConsultations.map(c=><article className="admin-consultation-card premium-surface-card" key={c.id}>
          <div className="admin-consultation-top">
            <div className="admin-student-identity"><div className="admin-avatar">{(c.studentName||"S").trim().charAt(0).toUpperCase()}</div><div><strong>{c.studentName||"Student"}</strong><span>{c.email||"No email"}{c.teacherName? " · with "+c.teacherName:""}</span></div></div>
            <span className={"admin-status-badge status-"+String(c.status||"unknown").toLowerCase()}>{c.status||"UNKNOWN"}</span>
          </div>
          <div className="admin-consultation-meta"><span><b>Requested date</b>{c.preferredDate||"Not specified"}</span><span><b>Preferred time</b>{c.preferredTime||"Not specified"}</span><span><b>Request ID</b>#{c.id}</span></div>
          <div className="admin-consultation-actions">
            <button type="button" className="admin-secondary-action" onClick={()=>setSelectedStudent(selectedStudent===c.id?null:c.id)}>{selectedStudent===c.id?"Hide student details":"View student profile"}</button>
            <div className="admin-status-actions">{["PENDING","APPROVED","REJECTED","COMPLETED"].map(status=><button type="button" key={status} className={c.status===status?"admin-status-action selected":"admin-status-action"} onClick={()=>setStatus(c.id,status)}>{status.charAt(0)+status.slice(1).toLowerCase()}</button>)}</div>
          </div>
          {selectedStudent===c.id && <div className="admin-student-details"><h3>Student learning profile</h3><div className="admin-detail-grid"><p><b>Age / Group</b>{c.studentProfile?.age||"—"} / {c.studentProfile?.ageGroup||"—"}</p><p><b>English level</b>{c.studentProfile?.englishLevel||"—"}</p><p><b>Learning goals</b>{c.studentProfile?.learningGoals||"—"}</p><p><b>Preferred category</b>{c.studentProfile?.preferredCategory||"—"}</p><p><b>Interests</b>{c.studentProfile?.interests||"—"}</p><p><b>Preferred schedule</b>{c.studentProfile?.preferredSchedule||"—"}</p><p><b>Introduction</b>{c.studentProfile?.introduction||"—"}</p>{c.studentProfile?.guardianName&&<p><b>Guardian</b>{c.studentProfile.guardianName} · {c.studentProfile.guardianPhone}</p>}</div></div>}
          {(c.teacherDecision||c.rejectionReason||c.adminPreviousStatus||c.decisionHistory)&&<details className="admin-decision-history"><summary>Decision history & notes</summary>{c.teacherDecision&&<p><b>Teacher decision:</b> {c.teacherDecision} · {c.teacherDecisionAt||""}</p>}{c.rejectionReason&&<p className="admin-rejection-note"><b>Rejection reason:</b> {c.rejectionReason}</p>}{c.adminPreviousStatus&&<p><b>Admin changed:</b> {c.adminPreviousStatus} → {c.status} · {c.adminNote||""} · {c.adminDecisionAt||""}</p>}{c.decisionHistory&&<p className="admin-history-text">{c.decisionHistory.replace(/\\n/g,"\n")}</p>}</details>}
          <div className="admin-consultation-footer"><span>Admin view only</span><button type="button" className="admin-remove-action" onClick={async()=>{if(!window.confirm("Remove this consultation from your admin dashboard only?"))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/CONSULTATION/${c.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setConsultations(old=>old.filter(x=>x.id!==c.id));setNotice("Consultation hidden from your dashboard.");}catch(e){setError(e.message);}}}>Remove from my dashboard</button></div>
        </article>)}
      </div>
    </section>
    <AdminToolsPanel user={currentUser} />\n  </WorkspaceShell></div>;
}

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = new URLSearchParams(window.location.search).get("token");

  async function handleResetPassword(e) {
    e.preventDefault();

    setError("");
    setMessage("");

    if (!token) {
      setError("This password reset link is missing or invalid.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please enter your new password twice.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
          data.error ||
          "Unable to reset your password. The link may have expired."
        );
      }

      setMessage(
        "Your password has been reset successfully. You can now log in with your new password."
      );
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(
        err.message ||
        "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function goToLogin() {
    window.history.replaceState({}, "", "/");
    window.location.reload();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#f8fafc",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "460px",
          padding: "32px",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div
            style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "10px",
            }}
          >
            Pick My Teacher
          </div>

          <h1 style={{ margin: 0, fontSize: "30px" }}>
            Reset Your Password
          </h1>

          <p
            style={{
              marginTop: "10px",
              color: "#6b7280",
              lineHeight: 1.6,
            }}
          >
            Enter a new password for your account.
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fef2f2",
              color: "#b91c1c",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              marginBottom: "18px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#f0fdf4",
              color: "#15803d",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        {!message && (
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: "18px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                New Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new password"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />
            </div>

            <div style={{ marginBottom: "22px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Confirm New Password
              </label>

              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter new password again"
                autoComplete="new-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "12px 14px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "15px",
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="signup-btn"
              style={{
                width: "100%",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}

        {message && (
          <button
            type="button"
            onClick={goToLogin}
            className="signup-btn"
            style={{
              width: "100%",
              marginTop: "4px",
            }}
          >
            Go to Login
          </button>
        )}
      </div>
    </div>
  );
}

function DownloadPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#f8f7f4", color: "#222", fontFamily: "Arial, sans-serif" }}>
      <header style={{ padding: "24px 7%", background: "#fff", borderBottom: "1px solid #eee" }}>
        <a href="/" style={{ color: "#222", textDecoration: "none", fontSize: 22, fontWeight: 800 }}>
          Pick My Teacher<span style={{ color: "#d88935" }}>.</span>
        </a>
      </header>

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "70px 24px", display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center" }}>
        <div style={{ flex: "1 1 320px" }}>
          <p style={{ color: "#b87325", fontWeight: 700 }}>ANDROID APP · VERSION 1.0</p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 58px)", lineHeight: 1.1, margin: "20px 0" }}>
            Your learning journey, one tap away.
          </h1>
          <p style={{ color: "#666", fontSize: 17, lineHeight: 1.8, marginBottom: 26 }}>
            Find the right English teacher for your learning goals with Pick My Teacher.
          </p>
          <a
            href="https://github.com/shormydas09-bit/seonbaeon-frontend/releases/download/v1.0/Pick-My-Teacher-v1.0.apk"
            style={{ display: "inline-block", background: "#222", color: "#fff", padding: "16px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}
          >
            ↓ Download for Android
          </a>
          <p style={{ color: "#777", fontSize: 13, marginTop: 12 }}>APK · Android · Version 1.0</p>
        </div>

        <div style={{ flex: "1 1 260px", textAlign: "center", background: "#fff", padding: 30, borderRadius: 24, border: "1px solid #eee" }}>
          <img src="/pwa-512x512.png" alt="Pick My Teacher logo" style={{ width: 200, maxWidth: "80%", borderRadius: 24 }} />
          <h2 style={{ marginTop: 20 }}>Pick My Teacher</h2>
          <p style={{ color: "#777", marginTop: 8 }}>Know Your Teacher Before You Join</p>
        </div>
      </section>

      <section style={{ background: "#fff", padding: "45px 24px", textAlign: "center" }}>
        <h2>How to install</h2>
        <p style={{ color: "#666", marginTop: 12 }}>1. Download the APK file.</p>
        <p style={{ color: "#666", marginTop: 8 }}>2. Open it from your Downloads folder.</p>
        <p style={{ color: "#666", marginTop: 8 }}>3. Allow installation if your phone asks.</p>
        <p style={{ color: "#666", marginTop: 8 }}>4. Install and open Pick My Teacher.</p>
      </section>

      <footer style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 13 }}>
        © Pick My Teacher
      </footer>
    </main>
  );
}
function App() {
  const [page, setPage] =
    useState("home");

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [selectedTeacher, setSelectedTeacher] =
    useState(null);

  const [authMode, setAuthMode] =
    useState("login");

  const [currentUser, setCurrentUser] =
    useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem(USER_KEY) ||
            "null"
        );
      } catch {
        return null;
      }
    });

  if (window.location.pathname === "/download") {
    return <DownloadPage />;
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  function openLogin() {
    setAuthMode("login");
    setPage("auth");
  }

  function openSignup() {
    setAuthMode("signup");
    setPage("auth");
  }

  function handleLogin(user) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    setCurrentUser(user);
    setPage(user.role === "TEACHER" ? "teacher-dashboard" : user.role === "ADMIN" ? "admin-dashboard" : "dashboard");
  }

  function handleProfileUpdated(updated) {
    const nextUser = { ...currentUser, ...updated, token: currentUser?.token };
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setCurrentUser(nextUser);
  }

  function handleLogout() {
    if (currentUser?.token) {
      fetch(`${API_URL}/users/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${currentUser.token}` },
      }).catch(() => {});
    }
    localStorage.removeItem(USER_KEY);

    setCurrentUser(null);
    setPage("home");
  }

  return (
    <div className="app theme-dark-premium">
      <nav className="navbar">
        <button
          className="logo logo-button"
          onClick={() =>
            setPage("home")
          }
        >
          Pick My Teacher<span>.</span>
        </button>

        <div className="nav-links">
          <button
            onClick={() =>
              setPage("home")
            }
          >
            Home
          </button>

          <button
            onClick={() =>
              setPage("teachers")
            }
          >
            Find Teachers
          </button>

          {currentUser && (
            <button
              onClick={() =>
                setPage("dashboard")
              }
            >
              Dashboard
            </button>
          )}

          <button
            onClick={() => {
              setPage("home");

              setTimeout(() => {
                document
                  .getElementById("how")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 0);
            }}
          >
            How It Works
          </button>

          <button
            onClick={() => {
              setPage("home");

              setTimeout(() => {
                document
                  .getElementById("home")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 0);
            }}
          >
            About
          </button>
        </div>

        <div className="nav-buttons">
          {currentUser ? (
            <>
              <button
                className="login-btn"
                onClick={() =>
                  setPage("dashboard")
                }
              >
                {currentUser.name ||
                  currentUser.email}
              </button>

              <button
                className="login-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                className="login-btn"
                onClick={openLogin}
              >
                Login
              </button>

              <button
                className="signup-btn"
                onClick={openSignup}
              >
                Get Started
              </button>
            </>
          )}
        </div>

        <button
          className={`mobile-menu-button ${
            mobileMenuOpen ? "mobile-menu-open" : ""
          }`}
          type="button"
          aria-label={
            mobileMenuOpen ? "Close navigation" : "Open navigation"
          }
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>

        {mobileMenuOpen && (
          <div className="mobile-nav-panel">
            <button onClick={() => { setPage("home"); setMobileMenuOpen(false); }}>
              Home
            </button>
            <button onClick={() => { setPage("teachers"); setMobileMenuOpen(false); }}>
              Find Teachers
            </button>
            {currentUser && (
              <button onClick={() => { setPage("dashboard"); setMobileMenuOpen(false); }}>
                Dashboard
              </button>
            )}
            <button
              onClick={() => {
                setPage("home");
                setMobileMenuOpen(false);
                setTimeout(() => {
                  document.getElementById("how")?.scrollIntoView({ behavior: "smooth" });
                }, 0);
              }}
            >
              How It Works
            </button>
            <div className="mobile-nav-divider" />
            {currentUser ? (
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}>
                Logout
              </button>
            ) : (
              <>
                <button onClick={() => { openLogin(); setMobileMenuOpen(false); }}>
                  Login
                </button>
                <button
                  className="mobile-nav-primary"
                  onClick={() => { openSignup(); setMobileMenuOpen(false); }}
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        )}
      </nav>

      {page === "home" && (
        <HomePage
          goToTeachers={() =>
            setPage("teachers")
          }
        />
      )}

      {page === "teachers" && (
        <TeacherSearch
          goHome={() =>
            setPage("home")
          }
          openProfile={(teacher) => {
            setSelectedTeacher(teacher);
            setPage("profile");
          }}
        />
      )}

      {page === "profile" && (
        <TeacherProfile
          teacher={selectedTeacher}
          currentUser={currentUser}
          goBack={() =>
            setPage("teachers")
          }
        />
      )}

      {page === "teacher-dashboard" && currentUser && (
        <TeacherWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "admin-dashboard" && currentUser && (
        <AdminWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "dashboard" && currentUser && currentUser.role === "TEACHER" && (
        <TeacherWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "dashboard" && currentUser && currentUser.role === "ADMIN" && (
        <AdminWorkspace currentUser={currentUser} handleLogout={handleLogout} />
      )}

      {page === "dashboard" && currentUser && currentUser.role !== "TEACHER" && currentUser.role !== "ADMIN" && (
        <StudentDashboard
          currentUser={currentUser}
          goToTeachers={() =>
            setPage("teachers")
          }
          handleLogout={handleLogout}
          onProfileUpdated={handleProfileUpdated}
        />
      )}

      {page === "auth" && (
        <AuthPage
          mode={authMode}
          setMode={setAuthMode}
          onLogin={handleLogin}
        />
      )}
    </div>
  );
}

export default App;


