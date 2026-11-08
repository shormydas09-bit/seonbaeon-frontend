import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./App.css";
import "./premium.css";
import "./dark-premium.css";
import "./refined-premium.css";
import "./admin-command-center.css";

const API_URL = `${(import.meta.env.VITE_API_URL || "https://seonbaeon-backend.onrender.com").replace(/\/$/, "")}/api`;
const FAVORITES_KEY = "pick-my-teacher-favorites";
const USER_KEY = "pick-my-teacher-logged-user";

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

async function waitForBackend({ attempts = 5, onRetry } = {}) {
  let lastError;
  const delays = [0, 1800, 3500, 6500, 10000];
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (attempt > 0) {
      onRetry?.(attempt);
      await wait(delays[attempt] || 10000);
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${API_URL}/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (response.ok) {
        const result = await response.json().catch(() => null);
        if (result?.status === "UP" && result?.database === "UP") return true;
        lastError = new Error("The service is online but the database is not ready yet.");
      } else {
        lastError = new Error(`The service is starting (HTTP ${response.status}).`);
      }
    } catch (error) {
      lastError = error.name === "AbortError"
        ? new Error("The server is still waking up.")
        : new Error("Could not reach the server yet.");
    } finally {
      window.clearTimeout(timeoutId);
    }
  }
  throw lastError || new Error("The server is temporarily unavailable. Please try again shortly.");
}


// Treat API-provided URLs as untrusted, including legacy database records.
// Never let user-controlled javascript:, data:, or other schemes reach URL sinks.
function safeExternalUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch {
    return "";
  }
}

function safeImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

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

function AuthPage({ mode, setMode, onLogin, onPolicyOpen }) {
  const [name, setName] = useState("");
  const [accountRole, setAccountRole] = useState("STUDENT");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [forgotMode, setForgotMode] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!email || !password || (mode === "signup" && !name)) {
      setError("Please fill in all required fields.");
      return;
    }
    if (mode === "signup" && !acceptedPolicies) {
      setError("Please accept the Terms of Service and Privacy Policy to create an account.");
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

      // Do not gate login behind a separate /health + database probe.
      // The authentication endpoint itself is the source of truth; this avoids
      // a false "server waking up" failure when health checks are slow.
      let response;
      let lastNetworkError = null;
      const maxAttempts = mode === "login" ? 3 : 1;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (attempt > 0) {
          setMessage(`Reconnecting securely… attempt ${attempt + 1} of ${maxAttempts}`);
          await wait(1800 * attempt);
        } else if (mode === "login") {
          setMessage("Connecting securely…");
        }
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 45000);
        try {
          response = await fetch(`${API_URL}${endpoint}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify(body),
            signal: controller.signal,
            cache: "no-store",
          });
          if (mode === "login" && [502, 503, 504].includes(response.status) && attempt < maxAttempts - 1) {
            lastNetworkError = new Error(`Login service is starting (HTTP ${response.status}).`);
            continue;
          }
          break;
        } catch (requestError) {
          lastNetworkError = requestError.name === "AbortError"
            ? new Error("The login request timed out. Please try again.")
            : new Error("Could not reach the login server. Check your connection and try again.");
          if (attempt === maxAttempts - 1) throw lastNetworkError;
        } finally {
          window.clearTimeout(timeoutId);
        }
      }
      if (!response) throw lastNetworkError || new Error("Login service is temporarily unavailable. Please try again.");

      const data = await readResponse(response);
      setMessage("");

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
          <div className="form-error" role="alert" aria-live="assertive">{error}</div>
        )}
        {message && <div className="form-success" role="status" aria-live="polite">{message}</div>}

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

          {mode === "signup" && (
            <label className="policy-consent">
              <input type="checkbox" checked={acceptedPolicies} onChange={(e) => setAcceptedPolicies(e.target.checked)} required />
              <span>I agree to the <button type="button" className="inline-policy-link" onClick={() => onPolicyOpen("terms")}>Terms of Service</button> and <button type="button" className="inline-policy-link" onClick={() => onPolicyOpen("privacy")}>Privacy Policy</button>.</span>
            </label>
          )}

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

function TeacherSearch({ goHome, openProfile, currentUser }) {
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
      await waitForBackend({ attempts: 4 });
      const timeout = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          controller.abort();
          reject(new Error("Teacher loading timed out after 30 seconds. Please retry."));
        }, 30000);
      });
      const request = (async () => {
        const response = await fetch(`${API_URL}/teachers`, {
          signal: controller.signal,
          headers: { Accept: "application/json", Authorization: `Bearer ${currentUser?.token || ""}` },
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
  }, [currentUser?.token]);

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
            <label htmlFor="teacher-search-query">Search</label><input id="teacher-search-query" type="search"
              aria-label="Search English teachers by name, category or specialty"
              placeholder="Search teacher, category or specialty..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
            />
          </div>

          <select
            aria-label="Filter by English teaching category"
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
            aria-label="Filter by location"
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

        <div className="results-header" aria-live="polite" aria-atomic="true">
          <strong>
            {!loading && !error ? `${filteredTeachers.length} English teachers found` : loading ? "Finding English teachers..." : ""}
          </strong>

          <span>
            English teachers for Korean children
          </span>
        </div>

        {loading && (
          <div className="no-results" role="status" aria-live="polite" aria-busy="true">
            <div>Loading</div><h2>Loading teachers...</h2>

            <p>
              Getting English teachers from the
              Pick My Teacher database.
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="no-results" role="alert">
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
                    <span>{teacher.profileImageUrl ? (<img src={safeImageUrl(teacher.profileImageUrl) || undefined} alt={teacher.name} onError={(event) => { event.currentTarget.style.display = "none"; event.currentTarget.parentElement.textContent = (teacher.name || "Teacher").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase(); }} />) : ((teacher.name || "Teacher").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase())}</span>

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
                          src={safeImageUrl(teacher.profileImageUrl) || undefined}
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
            <div className="no-results empty-state" role="status" aria-live="polite">
              <div className="status-label">No results</div>

              <h2>No English teachers found</h2>

              <p>
                Try changing your search or filters.
              </p>
              <button type="button" className="teacher-retry-btn" onClick={() => { setSearch(""); setCategory("All"); setLocation("All"); setRating("All"); }}>
                Clear all filters
              </button>
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
                      src={safeImageUrl(teacher.profileImageUrl) || undefined}
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
          `${API_URL}/teachers/${teacher.id}/videos`,
          { headers: { Authorization: `Bearer ${currentUser?.token || ""}` } }
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
      setConsultMessage("Please log in with your Student / Parent account before sending an enquiry.");
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
          "Enquiry sent successfully!"
      );

      setShowConsultation(false);
      formElement.reset();
    } catch (err) {
      setConsultMessage(
        err.message ||
          "Could not send the enquiry."
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
            <div className="consultation-modal" role="dialog" aria-modal="true" aria-labelledby="consultation-title" aria-describedby="consultation-description" tabIndex={-1}>
              <button
                type="button"
                aria-label="Close consultation enquiry form"
                className="close-consultation"
                onClick={() =>
                  setShowConsultation(false)
                }
              >
                ×
              </button>

              <h2 id="consultation-title">Send an Enquiry</h2>

              <p id="consultation-description">
                Send an enquiry to{" "}
                {teacher.name}.
              </p>

              {consultMessage && (
                <div className="form-error" role="alert" aria-live="assertive">
                  {consultMessage}
                </div>
              )}

              <form
                onSubmit={submitConsultation}
              >
                <label htmlFor="consult-student-name">Student Name</label>

                <input
                  id="consult-student-name"
                  name="studentName"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  placeholder="Enter your name"
                  defaultValue={
                    currentUser?.name || ""
                  }
                  required
                />

                <label htmlFor="consult-student-email">Email</label>

                <input
                  id="consult-student-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  placeholder="Enter your email"
                  defaultValue={
                    currentUser?.email || ""
                  }
                  readOnly={currentUser?.role === "STUDENT"}
                  required
                />

                <label htmlFor="consult-student-phone">Phone (Optional)</label>

                <input
                  id="consult-student-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={25}
                  pattern="[0-9+() .-]{7,25}"
                  title="Enter a valid phone number using digits, +, spaces, parentheses or hyphens."
                  placeholder="Enter your phone number"
                />

                <label htmlFor="consult-preferred-date">
                  Preferred trial date <span className="teacher-field-hint">Optional · only if you are requesting a trial</span>
                </label>

                <input
                  id="consult-preferred-date"
                  name="preferredDate"
                  type="date"
                  min={new Date().toISOString().slice(0, 10)}
                />

                <label htmlFor="consult-preferred-time">
                  Preferred trial time <span className="teacher-field-hint">Optional</span>
                </label>

                <input
                  id="consult-preferred-time"
                  name="preferredTime"
                  type="time"
                />

                <label htmlFor="consult-message">Message (Optional)</label>

                <textarea
                  id="consult-message"
                  name="message"
                  maxLength={2000}
                  placeholder="Ask about centre location, age groups, class schedule, fees or an optional trial..."
                  rows="4"
                />

                <button
                  type="submit"
                  className="submit-consultation"
                  aria-busy={consultSubmitting}
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
                src={safeImageUrl(teacher.profileImageUrl) || undefined}
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
              {Number(teacher.rating) > 0 && (
                <div className="profile-stat">
                  <strong>{Number(teacher.rating).toFixed(1)}</strong>
                  <span>Rating</span>
                </div>
              )}

              {Number(teacher.reviewCount) > 0 && (
                <div className="profile-stat">
                  <strong>{Number(teacher.reviewCount)}</strong>
                  <span>Reviews</span>
                </div>
              )}

              {teacher.experience && String(teacher.experience).trim() !== "0" && (
                <div className="profile-stat">
                  <strong>{teacher.experience}</strong>
                  <span>Experience</span>
                </div>
              )}

              {Number(teacher.studentCount) > 0 && (
                <div className="profile-stat">
                  <strong>{Number(teacher.studentCount)}+</strong>
                  <span>Students taught</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="profile-layout">
          <div className="profile-left">

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
                              src={safeExternalUrl(selectedVideo.videoUrl) || undefined}
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

            {(teacher.qualification || (teacher.experience && String(teacher.experience).trim() !== "0") || Number(teacher.studentCount) > 0) && (
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

                  {Number(teacher.studentCount) > 0 && (
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
                  <p>You can write a review after this teacher approves your enquiry.</p>
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
                Send Enquiry
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
  const [items,setItems]=useState([]);
  const [error,setError]=useState("");
  const [activeItem,setActiveItem]=useState(null);
  useEffect(()=>{fetch(`${API_URL}/workspace/student/progress`,{headers:{Authorization:`Bearer ${user?.token||""}`}}).then(readResponse).then(setItems).catch(e=>setError(e.message));},[]);
  return <>
    <button type="button" className="student-overview-accordion-item student-overview-trigger student-progress-overview-trigger" onClick={()=>setActiveItem("__overview__")}>
      <span className="overview-icon">↗</span><span className="student-overview-summary-copy"><small>MY LEARNING PROGRESS</small><strong>{items.length}</strong><span>Feedback updates</span></span><span className="student-overview-expand">View details <b>↗</b></span>
    </button>
    {activeItem&&<div className="student-feedback-overlay" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveItem(null);}}>
      <section className="student-feedback-modal" role="dialog" aria-modal="true" aria-labelledby="student-feedback-title">
        <button type="button" className="student-feedback-close" aria-label="Close feedback" onClick={()=>setActiveItem(null)}>×</button>
        <span className="student-feedback-eyebrow">YOUR LEARNING UPDATE</span>
        <h2 id="student-feedback-title">{activeItem==="__overview__"?"My Learning Progress":activeItem.subject||"Learning update"}</h2>
        {activeItem==="__overview__" ? (items.length===0?<p className="student-progress-empty">Your teacher feedback will appear here after your first progress update.</p>:<div className="student-progress-list">{items.map(n=><article key={n.id} className="student-progress-item"><div className="student-progress-item-heading"><b>{n.subject||"Learning update"}</b><small>{new Date(n.updatedAt).toLocaleString()}</small></div><p className="student-progress-copy">{n.note}</p><button type="button" className="student-progress-toggle" onClick={()=>setActiveItem(n)}>Read full feedback →</button></article>)}</div>) : <><time>{new Date(activeItem.updatedAt).toLocaleString()}</time><div className="student-feedback-full">{activeItem.note}</div></>}
        <button type="button" className="student-feedback-done" onClick={()=>setActiveItem(null)}>Close feedback</button>
      </section>
    </div>}
  </>;
}

function TeacherToolsPanel({ user, consultations, lessons = [] }) {
  const headers={ "Content-Type":"application/json",Authorization:`Bearer ${user?.token||""}` };
  const [notes,setNotes]=useState([]); const [slots,setSlots]=useState([]); const [analytics,setAnalytics]=useState(null); const [students,setStudents]=useState([]);
  const [studentUserId,setStudentUserId]=useState(""); const [subject,setSubject]=useState(""); const [note,setNote]=useState("");
  const [editingNoteId,setEditingNoteId]=useState(null); const [editingSubject,setEditingSubject]=useState(""); const [editingText,setEditingText]=useState("");
  const [startsAt,setStartsAt]=useState(""); const [endsAt,setEndsAt]=useState(""); const [slotNote,setSlotNote]=useState("");
  const [notice,setNotice]=useState(""); const [error,setError]=useState(""); const [activeMetric,setActiveMetric]=useState(""); const [expandedNoteId,setExpandedNoteId]=useState(null); const [showProgressHistory,setShowProgressHistory]=useState(false);
  
  async function load(){try{const [n,a,k,st]=await Promise.all([fetch(`${API_URL}/workspace/teacher/progress`,{headers}),fetch(`${API_URL}/workspace/teacher/availability`,{headers}),fetch(`${API_URL}/workspace/teacher/analytics`,{headers}),fetch(`${API_URL}/workspace/teacher/students`,{headers})]);setNotes(await readResponse(n));setSlots(await readResponse(a));setAnalytics(await readResponse(k));setStudents(await readResponse(st));}catch(e){setError(e.message);}}
  useEffect(()=>{load();},[]);
  async function saveNote(e){e.preventDefault();setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/progress`,{method:"POST",headers,body:JSON.stringify({studentUserId,subject,note})}));setSubject("");setNote("");setNotice("Student progress note saved.");await load();}catch(e){setError(e.message);}}
  async function updateProgressNote(e,id){e.preventDefault();setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/progress/${id}`,{method:"PUT",headers,body:JSON.stringify({subject:editingSubject,note:editingText})}));setEditingNoteId(null);setNotice("Progress note updated.");await load();}catch(e){setError(e.message);}}
  async function deleteProgressNote(id){if(!window.confirm("Delete this progress note?"))return;setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/progress/${id}`,{method:"DELETE",headers}));setNotice("Progress note deleted.");await load();}catch(e){setError(e.message);}}
  async function addSlot(e){e.preventDefault();setError("");setNotice("");try{await readResponse(await fetch(`${API_URL}/workspace/teacher/availability`,{method:"POST",headers,body:JSON.stringify({startsAt,endsAt,note:slotNote})}));setStartsAt("");setEndsAt("");setSlotNote("");setNotice("Availability slot added.");await load();}catch(e){setError(e.message);}}
  async function removeSlot(id){try{await readResponse(await fetch(`${API_URL}/workspace/teacher/availability/${id}`,{method:"DELETE",headers}));await load();}catch(e){setError(e.message);}}
  return <section className="teacher-tools-panel"><header className="teacher-tools-heading"><span className="eyebrow">TEACHER WORKSPACE</span><h2>Teaching Tools</h2><p>Manage confirmed availability and share useful learning feedback when needed.</p></header>
    {notice&&<p style={{color:"#067647"}}>{notice}</p>}{error&&<p style={{color:"#b42318"}}>{error}</p>}
    {analytics&&<div className="teacher-analytics-grid">{[["Students",analytics.students],["Consultations",analytics.consultations],["Pending",analytics.pendingConsultations],["Lessons",analytics.lessons],["Completed",analytics.completedLessons],["Reviews",analytics.reviews],["Rating",Number(analytics.averageRating||0).toFixed(1)]].map(([k,v])=><button type="button" className={`teacher-analytics-tile ${activeMetric===k?"is-selected":""}`} key={k} aria-expanded={activeMetric===k} onClick={()=>setActiveMetric(activeMetric===k?"":k)}><small>{k}</small><strong>{v??0}</strong><span className="teacher-metric-open-hint">View records</span></button>)}</div>}
    {activeMetric&&<section className="teacher-metric-detail" aria-live="polite">
      <div className="teacher-metric-detail-heading"><div><span className="teacher-library-kicker">WORKSPACE OVERVIEW</span><h3>{activeMetric} details</h3><p>Quick access to the records behind this dashboard summary.</p></div><button type="button" className="login-btn" onClick={()=>setActiveMetric("")}>Close</button></div>
      {activeMetric==="Students"&&<div className="teacher-metric-records">{students.length?students.map(st=><article key={st.id}><b>{st.name||"Student"}</b><span>{st.email||"Linked student"}</span></article>):<p className="teacher-metric-empty">No linked students yet.</p>}</div>}
      {(activeMetric==="Consultations"||activeMetric==="Pending")&&<div className="teacher-metric-records">{(activeMetric==="Pending"?consultations.filter(c=>c.status==="PENDING"):consultations).length?(activeMetric==="Pending"?consultations.filter(c=>c.status==="PENDING"):consultations).map(c=><article key={c.id}><div><b>{c.studentName||"Student"}</b><span>{c.preferredDate||"Date not specified"} · {c.preferredTime||"Time not specified"}</span></div><em className={`teacher-metric-status status-${String(c.status||"").toLowerCase()}`}>{c.status||"UNKNOWN"}</em></article>):<p className="teacher-metric-empty">{activeMetric==="Pending"?"No pending consultation requests.":"No consultation requests yet."}</p>}</div>}
      {(activeMetric==="Lessons"||activeMetric==="Completed")&&<div className="teacher-metric-records">{(activeMetric==="Completed"?lessons.filter(l=>l.status==="COMPLETED"):lessons).length?(activeMetric==="Completed"?lessons.filter(l=>l.status==="COMPLETED"):lessons).map(l=><article key={l.id}><div><b>{l.studentName||"Student"}</b><span>{l.scheduledAt?new Date(l.scheduledAt).toLocaleString():"Schedule not set"} · {l.durationMinutes||30} min</span></div><em className={`teacher-metric-status status-${String(l.status||"").toLowerCase()}`}>{l.status||"UNKNOWN"}</em></article>):<p className="teacher-metric-empty">No {activeMetric.toLowerCase()} records to show.</p>}</div>}
      {(activeMetric==="Reviews"||activeMetric==="Rating")&&<div className="teacher-metric-summary"><strong>{activeMetric==="Rating"?(`${Number(analytics?.averageRating||0).toFixed(1)} / 5`):(`${analytics?.reviews??0} reviews`)}</strong><p>{activeMetric==="Rating"?"Your current average rating based on student reviews.":"The total number of reviews currently associated with your teacher profile."}</p></div>}
    </section>}
    <div className="teacher-tools-section teacher-progress-tools-section"><h3>Create a Student Progress Update</h3><p className="section-hint">Record strengths, areas to develop and practical next steps.</p>
    <form className="teacher-progress-form" onSubmit={saveNote}>
      <select required value={studentUserId} onChange={e=>setStudentUserId(e.target.value)}><option value="">Select linked student</option>{students.map(st=><option key={st.id} value={st.id}>{st.name} · {st.email}</option>)}</select>
      
      <input required maxLength="120" placeholder="Topic / subject (e.g. Phonics)" value={subject} onChange={e=>setSubject(e.target.value)}/>
      <textarea required maxLength="3000" rows="3" placeholder="Write strengths, improvement areas and homework..." value={note} onChange={e=>setNote(e.target.value)}/>
      <button className="signup-btn" disabled={!studentUserId}>Save progress note</button>
    </form>
    <div className="teacher-progress-library">
      <div className="teacher-progress-library-heading"><div><span className="teacher-library-kicker">FEEDBACK LIBRARY</span><h4>Progress update history</h4><p>Your updates stay organised by student and date. Select the note count to open your full feedback history.</p></div><button type="button" className="teacher-note-count teacher-note-count-toggle" aria-expanded={showProgressHistory} aria-controls="teacher-progress-history" onClick={()=>setShowProgressHistory(v=>!v)}>{notes.length} {notes.length===1?"NOTE":"NOTES"} <span aria-hidden="true">{showProgressHistory?"−":"+"}</span></button></div>
      {showProgressHistory&&<DashboardOverlay title="Progress update history" subtitle={`${notes.length} saved ${notes.length===1?"update":"updates"} · Review feedback by student and date`} onClose={()=>setShowProgressHistory(false)}>
        <div className="teacher-progress-history-modal-list">{notes.length===0?<div className="teacher-notes-empty">No progress notes have been added yet.</div>:notes.map(n=>{
        const linkedStudent=students.find(st=>String(st.id)===String(n.studentUserId||n.studentId||n.student?.id));
        const studentLabel=n.studentName||n.student?.name||linkedStudent?.name||"Linked student";
        return <article className="teacher-progress-item" key={n.id}>
          {editingNoteId===n.id?<form onSubmit={e=>updateProgressNote(e,n.id)} style={{display:"grid",gap:8}}>
            <input required maxLength="120" aria-label="Edit progress note subject" value={editingSubject} onChange={e=>setEditingSubject(e.target.value)}/>
            <textarea required maxLength="3000" rows="3" aria-label="Edit progress note" value={editingText} onChange={e=>setEditingText(e.target.value)}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="signup-btn" type="submit">Save changes</button><button className="login-btn" type="button" onClick={()=>setEditingNoteId(null)}>Cancel</button></div>
          </form>:<>
            <div className="teacher-note-card-top"><b>{n.subject}</b><span className="teacher-note-student">{studentLabel}</span></div>
            <p className={`teacher-note-content ${expandedNoteId===n.id?"is-expanded":""}`} style={{whiteSpace:"pre-wrap"}}>{n.note}</p>
            <button type="button" className="teacher-note-expand" aria-expanded={expandedNoteId===n.id} onClick={()=>setExpandedNoteId(expandedNoteId===n.id?null:n.id)}>{expandedNoteId===n.id?"Show less":"View full feedback"}</button>
            <div className="teacher-note-meta"><span>UPDATED</span><time dateTime={n.updatedAt}>{new Date(n.updatedAt).toLocaleString()}</time></div>
            <div className="teacher-note-actions"><button className="login-btn" type="button" onClick={()=>{setEditingNoteId(n.id);setEditingSubject(n.subject||"");setEditingText(n.note||"");}}>Edit</button><button className="login-btn" type="button" onClick={()=>deleteProgressNote(n.id)}>Delete</button></div>
          </>}
        </article>;
      })}</div>
      </DashboardOverlay>}
    </div></div>
    <div className="teacher-tools-section teacher-availability-section"><h3>Availability Calendar</h3><p className="section-hint">Set the time slots when students can request a consultation or book a lesson.</p><form className="teacher-availability-form" onSubmit={addSlot}>
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
  const [activeUserGroup,setActiveUserGroup]=useState("");
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
  async function deleteUserAccount(account){
    const role=String(account.role||"").toUpperCase();
    if(!["TEACHER","STUDENT"].includes(role))return;
    if(!window.confirm(`Permanently delete ${account.name||account.email}'s ${role.toLowerCase()} account? This also removes associated profile and account records. This cannot be undone.`))return;
    try{
      await readResponse(await fetch(`${API_URL}/workspace/admin/users/${account.id}`,{method:"DELETE",headers}));
      setNotice(`${role==="TEACHER"?"Teacher":"Student"} account permanently deleted.`);
      await load();
    }catch(e){setError(e.message||"Could not delete this account.");}
  }
  async function setReviewHidden(id,hidden){try{await readResponse(await fetch(`${API_URL}/workspace/admin/reviews/${id}/visibility`,{method:"PATCH",headers,body:JSON.stringify({hidden})}));setNotice(hidden?"Review hidden from public profiles.":"Review restored to public profiles.");await load();}catch(e){setError(e.message);}}
  async function removeReview(id){if(!window.confirm("Permanently remove this review? This cannot be undone."))return;try{await readResponse(await fetch(`${API_URL}/workspace/admin/reviews/${id}`,{method:"DELETE",headers}));setNotice("Review permanently removed and teacher rating recalculated.");await load();}catch(e){setError(e.message);}}
  const visibleReviews=reviews.filter(r=>(reviewFilter==="ALL"||(reviewFilter==="REPORTED"&&r.reported)||(reviewFilter==="HIDDEN"&&r.hidden)||(reviewFilter==="PUBLIC"&&!r.hidden))&&(!search.trim()||[r.teacherName,r.studentName,r.text,r.reportReason].filter(Boolean).some(v=>String(v).toLowerCase().includes(search.trim().toLowerCase()))));
  const metricLabels={users:"Total users",students:"Students",teachers:"Teacher accounts",teacherProfiles:"Teacher profiles",reviews:"Student reviews"};
  const recentActivity=activity.filter(item=>item.type==="REVIEW");
  return <div className="admin-tools-panel">
    <header className="admin-tools-header"><div><p className="admin-tools-eyebrow">PLATFORM CONTROL CENTER</p><h2>Platform Overview &amp; Moderation</h2><p>Monitor platform activity and keep teacher reviews trustworthy.</p></div><button type="button" className="admin-tools-refresh" onClick={load}>↻ <span>Refresh data</span></button></header>
    {notice&&<p className="admin-tools-notice" role="status">{notice}</p>}{error&&<p className="admin-tools-error" role="alert">{error}</p>}
    {overview&&<section className="admin-tools-metrics" aria-label="Platform metrics">{Object.entries(metricLabels).map(([key,label])=><article className="admin-tools-metric" key={key}><span>{label}</span><strong>{overview[key]??0}</strong></article>)}</section>}
    <section className="admin-tools-section admin-review-section">
      <div className="admin-tools-section-heading"><div><span className="admin-tools-kicker">TRUST &amp; SAFETY</span><h3>Review Moderation</h3><p>Review reports and manage the visibility of student feedback.</p></div><div className="admin-report-count"><strong>{reviews.filter(r=>r.reported&&!r.hidden).length}</strong><span>Reports pending review</span></div></div>
      <div className="admin-review-toolbar"><input aria-label="Search reviews" placeholder="Search teacher, student or review..." value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filter reviews" value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="ALL">All reviews</option><option value="REPORTED">Reported</option><option value="PUBLIC">Public</option><option value="HIDDEN">Hidden</option></select></div>
      {visibleReviews.length===0?<div className="admin-tools-empty">No reviews match this filter.</div>:<div className="admin-review-list">{visibleReviews.map(r=><article className="admin-review-card" key={r.id}>
        <div className="admin-review-card-head"><div><b>{r.teacherName}</b><span>By {r.studentName} · {r.rating}/5 · {r.createdAt?new Date(r.createdAt).toLocaleDateString():"Date unavailable"}</span></div><div className="admin-review-badges">{r.reported&&<span className="is-reported">Reported</span>}<span>{r.hidden?"Hidden":"Public"}</span></div></div>
        <p className="admin-review-text">{r.text}</p>{r.reportReason&&<p className="admin-review-reason"><b>Report reason:</b> {r.reportReason}</p>}
        <div className="admin-tools-actions"><button type="button" className="admin-tools-secondary" onClick={()=>setReviewHidden(r.id,!r.hidden)}>{r.hidden?"Restore review":"Hide review"}</button><button type="button" className="admin-tools-danger" onClick={()=>removeReview(r.id)}>Permanently remove</button></div>
      </article>)}</div>}
    </section>
    <section className="admin-tools-section admin-activity-section"><div className="admin-tools-section-heading"><div><span className="admin-tools-kicker">LATEST UPDATES</span><h3>Admin Activity Overview</h3><p>Recent platform activity and student reviews (up to 50 records).</p></div></div>
      {recentActivity.length===0?<div className="admin-tools-empty">No recent review activity yet.</div>:<div className="admin-activity-list">{recentActivity.map((item,index)=><article className="admin-activity-row" key={item.type+"-"+item.occurredAt+"-"+index}><span className="admin-activity-icon">★</span><div><b>{item.title}</b><p>{item.detail}</p><small>{item.status} · {new Date(item.occurredAt).toLocaleString()}</small></div></article>)}</div>}
    </section>
    <section className="admin-tools-section admin-users-section">
      <div className="admin-tools-section-heading"><div><span className="admin-tools-kicker">ACCOUNT ACCESS</span><h3>User Management <span className="admin-user-count">{users.length}</span></h3><p>Choose an account type to view users, suspend access, or change account authority.</p></div></div>
      <div className="admin-user-groups">
        {["ADMIN","TEACHER","STUDENT"].map(role=>{const groupUsers=users.filter(x=>String(x.role||"STUDENT").toUpperCase()===role);const isOpen=activeUserGroup===role;return <section className={`admin-user-group ${isOpen?"is-open":""}`} key={role}>
          <button type="button" className="admin-user-group-toggle" aria-expanded={isOpen} onClick={()=>setActiveUserGroup(isOpen?"":role)}>
            <span className="admin-user-group-icon">{role==="ADMIN"?"◆":role==="TEACHER"?"✦":"●"}</span>
            <span className="admin-user-group-copy"><strong>{role==="ADMIN"?"Administrators":role==="TEACHER"?"Teachers":"Students"}</strong><small>{role==="ADMIN"?"Platform access & permissions":role==="TEACHER"?"Teacher accounts & publishing access":"Student accounts & learning access"}</small></span>
            <span className="admin-user-group-count">{groupUsers.length} {groupUsers.length===1?"account":"accounts"}</span>
            <span className="admin-user-group-chevron">{isOpen?"−":"＋"}</span>
          </button>
          {isOpen&&<div className="admin-user-group-list">{groupUsers.length===0?<div className="admin-tools-empty">No {role.toLowerCase()} accounts yet.</div>:groupUsers.map(x=><article className="admin-user-row" key={x.id}>
            <div className="admin-user-identity"><strong>{x.name||"Unnamed user"}</strong><span>{x.email||"No email available"}</span><small className={x.active===false?"is-suspended":"is-active"}><i/> {x.active===false?"Suspended":"Active"}</small></div>
            <div className="admin-user-actions"><label className="admin-user-role-control"><span>Account authority</span><select aria-label={`Change authority for ${x.name}`} value={String(x.role||"STUDENT").toUpperCase()} onChange={e=>changeRole(x.id,e.target.value)}><option value="STUDENT">Student</option><option value="TEACHER">Teacher</option><option value="ADMIN">Admin</option></select></label><button type="button" className={x.active===false?"admin-tools-restore":"admin-tools-danger"} disabled={String(x.role).toUpperCase()==="ADMIN"&&String(x.id)===String(user?.id)} onClick={()=>changeStatus(x.id,x.active===false)}>{x.active===false?"Reactivate":"Suspend access"}</button>{["TEACHER","STUDENT"].includes(String(x.role||"").toUpperCase())&&<button type="button" className="admin-user-delete" onClick={()=>deleteUserAccount(x)}>Delete account</button>}</div>
          </article>)}</div>}
        </section>})}
      </div>
    </section>
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
            Discover teachers, watch demos and keep your enquiries in one place.
          </p>
          <div className="student-hero-actions"><NotificationCenter user={currentUser} /><AccountDeletionButton user={currentUser} onDeleted={handleLogout} /></div>
        </div>

        <div className="student-overview-row-final" aria-label="Learning overview" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:"16px",width:"100%",maxWidth:"100%",alignItems:"stretch",boxSizing:"border-box"}}>
          <button type="button" className="student-overview-accordion-item student-overview-trigger" onClick={()=>setActiveOverview("lessons")}>
            <span className="overview-icon">▣</span><span className="student-overview-summary-copy"><small>SCHEDULED SESSIONS</small><strong>{myLessons.filter(lesson=>lesson.status==="SCHEDULED").length}</strong><span>Scheduled sessions</span></span><span className="student-overview-expand">View details <b>↗</b></span>
          </button>
          <button type="button" className="student-overview-accordion-item student-overview-trigger" onClick={()=>setActiveOverview("consultations")}>
            <span className="overview-icon">◷</span><span className="student-overview-summary-copy"><small>MY ENQUIRIES</small><strong>{myRequests.length}</strong><span>Teacher requests</span></span><span className="student-overview-expand">View details <b>↗</b></span>
          </button>
          <button type="button" className="student-overview-accordion-item student-overview-trigger" onClick={()=>setActiveOverview("favorites")}>
            <span className="overview-icon">♡</span><span className="student-overview-summary-copy"><small>FAVORITE TEACHERS</small><strong>{favoriteTeachers.length}</strong><span>Saved profiles</span></span><span className="student-overview-expand">View details <b>↗</b></span>
          </button>

        </div>

        {activeOverview && <DashboardOverlay
          title={activeOverview==="lessons"?"Scheduled sessions":activeOverview==="consultations"?"My enquiries":"Favorite teachers"}
          subtitle={activeOverview==="lessons"?"Your confirmed learning sessions and optional trials":activeOverview==="consultations"?"Messages and requests sent to teachers":"Teachers you have saved for later"}
          onClose={()=>setActiveOverview("")}
        >
          {activeOverview==="lessons" && <>
            {lessonError&&<p className="student-inline-error">{lessonError}</p>}
            {myLessons.length===0?<p className="student-overview-empty">No lessons scheduled yet.</p>:myLessons.map(lesson=><div className="student-overview-table-row" key={lesson.id}>
              <div className="student-overview-row-main"><strong>{lesson.teacherName||"Your English teacher"}</strong><span>{new Date(lesson.scheduledAt).toLocaleString()} · {lesson.durationMinutes} min</span>{lesson.meetingLink&&<a className="student-join-link" href={safeExternalUrl(lesson.meetingLink) || undefined} target="_blank" rel="noreferrer">Join lesson ↗</a>}</div>
              <div className="student-overview-row-meta"><em className={`student-status-pill ${lesson.status==="SCHEDULED"?"is-scheduled":""}`}>{lesson.status}</em><div className="student-overview-row-actions">{lesson.status==="SCHEDULED"&&<button type="button" className="compare-btn" onClick={async()=>{if(!window.confirm("Cancel this lesson?"))return;const reason=window.prompt("Optional cancellation reason:")||"";try{await readResponse(await fetch(`${API_URL}/lessons/${lesson.id}/status`,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:`Bearer ${currentUser.token}`},body:JSON.stringify({status:"CANCELLED",reason})}));setMyLessons(old=>old.map(x=>x.id===lesson.id?{...x,status:"CANCELLED",cancellationReason:reason}:x));}catch(e){setLessonError(e.message);}}}>Cancel lesson</button>}<button type="button" className="login-btn" onClick={async()=>{if(!window.confirm("Remove this lesson from your dashboard only?"))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/LESSON/${lesson.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setMyLessons(old=>old.filter(x=>x.id!==lesson.id));}catch(e){setLessonError(e.message);}}}>Hide</button></div></div>
            </div>)}
          </>}
          {activeOverview==="consultations" && <>
            {requestError&&<p className="student-inline-error">{requestError}</p>}
            {myRequests.length===0?<p className="student-overview-empty">No consultation requests yet.</p>:myRequests.map(r=><article className="student-overview-table-row student-consultation-detail-card" key={r.id}>
              <div className="student-overview-row-main">
                <div className="student-consultation-card-top"><div><small>TEACHER REQUEST</small><strong>{r.teacherName||"English teacher"}</strong><span>{r.teacherCategory||"English"} consultation</span></div><em className={`student-status-pill ${r.status==="APPROVED"?"is-approved":r.status==="REJECTED"?"is-rejected":"is-pending"}`}>{r.status||"PENDING"}</em></div>
                <div className="student-consultation-facts">
                  {(r.createdAt||r.requestedAt)&&<div><small>REQUEST SENT</small><b>{new Date(r.createdAt||r.requestedAt).toLocaleString()}</b></div>}
                  {(r.preferredDate||r.preferredTime)&&<div><small>PREFERRED TIME</small><b>{[r.preferredDate,r.preferredTime].filter(Boolean).join(" · ")}</b></div>}
                  {r.phone&&<div><small>PHONE</small><b>{r.phone}</b></div>}
                  {r.email&&<div><small>EMAIL</small><b>{r.email}</b></div>}
                </div>
                {r.message&&<div className="student-consultation-message"><small>YOUR MESSAGE</small><p>{r.message}</p></div>}
                {r.status==="PENDING"&&<p className="student-consultation-state">Your request is waiting for the teacher's review.</p>}
                {r.status==="APPROVED"&&<p className="request-positive">Approved · Your teacher will arrange lesson details.</p>}
                {r.status==="REJECTED"&&<p className="request-negative">Not approved. {r.rejectionReason||"Please try another time."}</p>}
                {r.adminPreviousStatus&&<p className="student-consultation-state">Admin update: {r.adminPreviousStatus} → {r.status}. {r.adminNote||""}</p>}
                {r.decisionHistory&&<details className="student-request-history"><summary>View request history</summary><pre>{r.decisionHistory}</pre></details>}
              </div>
              <div className="student-overview-row-meta"><button type="button" className="login-btn" onClick={async()=>{if(!window.confirm("Remove this request from your dashboard only? The teacher and admin records will remain unchanged."))return;try{await readResponse(await fetch(`${API_URL}/workspace/hide/CONSULTATION/${r.id}`,{method:"POST",headers:{Authorization:`Bearer ${currentUser.token}`}}));setMyRequests(old=>old.filter(x=>x.id!==r.id));}catch(e){setRequestError(e.message);}}}>Hide</button></div>
            </article>)}
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

          <div className="card student-discover-card"><div className="dashboard-card-label">DISCOVER</div><h3>Find your teacher</h3><p>Explore English teachers, compare teaching styles and watch free demo lessons before you decide.</p><button className="signup-btn" onClick={goToTeachers}>Find Teachers <span aria-hidden="true">→</span></button></div>

          <div className="card student-learning-card">
            <div className="dashboard-card-label">PREFERENCES</div><h3>Learning preferences</h3><p className="student-profile-intro">Optional details to help you find a suitable English teacher.</p>
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

function AccountDeletionButton({ user, onDeleted }) {
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  async function deleteOwnAccount(){
    const role=String(user?.role||"").toUpperCase();
    if(!["TEACHER","STUDENT"].includes(role))return;
    if(!window.confirm("Permanently delete your account? Your profile and associated account data will be removed. This cannot be undone."))return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`${API_URL}/workspace/account`,{method:"DELETE",headers:{Authorization:`Bearer ${user?.token||""}`}});
      await readResponse(response);
      onDeleted();
    }catch(e){setError(e.message||"Account deletion failed. Please try again.");setBusy(false);}
  }
  return <div className="account-delete-area" style={{display:"flex",alignItems:"center",justifyContent:"center",flex:"0 0 auto",margin:0,minWidth:"max-content"}}><button type="button" className="account-delete-button" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:52,margin:0,whiteSpace:"nowrap",lineHeight:1.2}} disabled={busy} onClick={deleteOwnAccount}>{busy?"Deleting account…":"Delete my account"}</button>{error&&<p role="alert" className="account-delete-error">{error}</p>}</div>;
}

function WorkspaceShell({ title, subtitle, user, onLogout, children }) {
  return (
    <main className="workspace-premium-shell" style={{ minHeight: "75vh" }}>
      <section className="workspace-premium-content" style={{ maxWidth: 1320, margin: "0 auto" }}>
        <div className="workspace-premium-heading admin-workspace-heading">
          <div className="workspace-heading-copy">
            <p className="workspace-eyebrow">PICK MY TEACHER · WORKSPACE</p>
            <h1 style={{ color: "#f7f9ff", WebkitTextFillColor: "#f7f9ff", fontWeight: 850, fontSize: "clamp(29px, 3vw, 38px)", lineHeight: 1.12, letterSpacing: "-.05em" }}>{title}</h1>
            <p className="workspace-subtitle">{subtitle} · {user?.email}</p>
          </div>
          <div className="workspace-heading-actions" style={{display:"flex",alignItems:"center",justifyContent:"flex-end",gap:14,flexWrap:"wrap",minWidth:0}}>
            <NotificationCenter user={user} />
            <button className="login-btn" style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minHeight:52,margin:0,whiteSpace:"nowrap"}} onClick={onLogout}>Log out</button>{["TEACHER","STUDENT"].includes(String(user?.role||"").toUpperCase())&&<AccountDeletionButton user={user} onDeleted={onLogout}/>}
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
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [lessons, setLessons] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [lessonDrafts, setLessonDrafts] = useState({});
  const [lessonNotice, setLessonNotice] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState("");
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
    // Load the approval-bearing teacher profile independently. A failure in
    // analytics, videos or student lists must never hide an approved dashboard.
    const profileResult = await fetch(`${API_URL}/workspace/teacher/profile`, { headers })
      .then(readResponse)
      .catch(error => ({ __loadError: error }));

    if (profileResult?.__loadError) {
      setError(profileResult.__loadError.message || "Could not load your teacher profile. Please refresh.");
      return;
    }
    if (profileResult && profileResult.profile !== "NOT_CREATED") {
      setProfile(old => ({ ...old, ...profileResult }));
      setError("");
    }

    const endpoints = [
      ["videos", `${API_URL}/workspace/teacher/videos`, setVideos, []],
      ["enquiries", `${API_URL}/workspace/teacher/consultations`, setConsultations, []],
      ["analytics", `${API_URL}/workspace/teacher/analytics`, setAnalytics, null],
      ["students", `${API_URL}/workspace/teacher/students`, setConnectedStudents, []],
    ];

    const results = await Promise.allSettled(
      endpoints.map(([, url]) => fetch(url, { headers }).then(readResponse))
    );

    const failed = [];
    results.forEach((result, index) => {
      const [label, , setter, fallback] = endpoints[index];
      if (result.status === "fulfilled") {
        setter(result.value ?? fallback);
      } else {
        setter(fallback);
        failed.push(label);
      }
    });

    if (failed.length) {
      setError(`Your teacher approval and profile are loaded, but some dashboard data could not load (${failed.join(", ")}). Please refresh to retry.`);
    }
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
      setNotice(savedProfile.verified
        ? "Profile updated. Your teacher approval remains active."
        : "Application submitted. Your profile is now waiting for admin verification.");
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function deleteEnquiry(id) {
    if (!window.confirm("Delete this student enquiry? This action cannot be undone.")) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`${API_URL}/consultations/${id}`, {
        method: "DELETE",
        headers: { ...headers, Accept: "application/json" },
      });
      if (response.status !== 204) await readResponse(response);
      setConsultations(items => items.filter(item => String(item.id) !== String(id)));
      setSelectedStudent(null);
      setNotice("Student enquiry deleted.");
    } catch (e) {
      setError(e.message || "Could not delete this enquiry.");
    } finally {
      setBusy(false);
    }
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
  return <div className="teacher-dashboard-redesign teacher-dashboard-v2"><WorkspaceShell title="Teacher Dashboard" subtitle="Build your teaching profile and connect with English learners" user={currentUser} onLogout={handleLogout}>
    {notice && <p className="teacher-dashboard-alert success">{notice}</p>}
    {error && <p className="teacher-dashboard-alert error">{error}</p>}
    {!profile.verified && <div className="card teacher-application-status" style={{border:"1px solid rgba(117,151,190,.25)",borderRadius:18,padding:"22px 24px",background:"linear-gradient(145deg,#172b45 0%,#102139 100%)",color:"#edf4ff"}}><span className="teacher-dashboard-eyebrow">APPLICATION STATUS</span><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:8}}><h2 style={{margin:0,color:"#f4f7ff"}}>{!profile.id?"Complete your teacher application":profile.rejectionReason?"Application rejected":profile.available===false?"Application needs attention":"Waiting for admin verification"}</h2><span style={{display:"inline-flex",alignItems:"center",padding:"6px 11px",borderRadius:999,fontSize:12,fontWeight:800,background:profile.rejectionReason?"rgba(255,128,128,.13)":"rgba(105,207,194,.13)",color:profile.rejectionReason?"#ffaaaa":"#75d8cb",border:profile.rejectionReason?"1px solid rgba(255,128,128,.3)":"1px solid rgba(105,207,194,.25)"}}>{!profile.id?"NOT SUBMITTED":profile.rejectionReason?"REJECTED":profile.available===false?"ACTION REQUIRED":"PENDING REVIEW"}</span></div><p style={{color:"#afc2dd",margin:"10px 0 0"}}>{!profile.id?"Complete your profile and submit it for review. Students can discover your profile after admin approval.":profile.rejectionReason?"Your application was reviewed by the admin and was not approved. Read the reason below, update your application, and submit it again for review.":profile.available===false?"Your profile is not currently published. Please review your application details.":"Your application has been submitted and is waiting for admin review. You can update your details while you wait."}</p>{profile.rejectionReason&&<div style={{marginTop:16,padding:"14px 16px",borderRadius:13,background:"rgba(255,128,128,.08)",border:"1px solid rgba(255,128,128,.24)"}}><strong style={{display:"block",fontSize:12,color:"#ffaaaa",marginBottom:6}}>ADMIN'S REJECTION REASON</strong><p style={{margin:0,color:"#f1dada",lineHeight:1.6}}>{profile.rejectionReason}</p>{profile.rejectedAt&&<small style={{display:"block",marginTop:8,color:"#aabbd5"}}>Reviewed: {new Date(profile.rejectedAt).toLocaleString()}</small>}</div>}</div>}
    {profile.verified && <section className="teacher-dashboard-welcome"><div><span className="teacher-dashboard-eyebrow">YOUR TEACHING SPACE</span><h2>Welcome back, {currentUser?.name?.split(" ")[0] || "Teacher"}</h2><p>Keep your profile up to date and help more students discover your English classes.</p></div><span className="teacher-published-pill"><i/> Profile published</span></section>}
    {profile.verified && <>
      <section className="teacher-dashboard-stats" aria-label="Teacher overview">
        <button type="button" className={"teacher-stat-card "+(selectedMetric==="enquiries"?"active":"")} aria-expanded={selectedMetric==="enquiries"} onClick={()=>setSelectedMetric(selectedMetric==="enquiries"?"":"enquiries")}><span className="teacher-stat-icon" style={{display:"grid",placeItems:"center",alignSelf:"center",flex:"0 0 58px",width:58,height:58,minWidth:58,minHeight:58,fontSize:26,lineHeight:1,fontFamily:"Arial, sans-serif",textAlign:"center",boxSizing:"border-box"}}>✉</span><span className="teacher-stat-copy"><small>STUDENT ENQUIRIES</small><strong>{consultations.length}</strong><em>View enquiries</em></span><span className="teacher-stat-arrow">›</span></button>
        <button type="button" className={"teacher-stat-card "+(selectedMetric==="students"?"active":"")} aria-expanded={selectedMetric==="students"} onClick={()=>setSelectedMetric(selectedMetric==="students"?"":"students")}><span className="teacher-stat-icon" style={{display:"grid",placeItems:"center",alignSelf:"center",flex:"0 0 58px",width:58,height:58,minWidth:58,minHeight:58,fontSize:26,lineHeight:1,fontFamily:"Arial, sans-serif",textAlign:"center",boxSizing:"border-box"}}>♙</span><span className="teacher-stat-copy"><small>CONNECTED STUDENTS</small><strong>{analytics?.students ?? consultations.length}</strong><em>View students</em></span><span className="teacher-stat-arrow">›</span></button>
        <button type="button" className={"teacher-stat-card "+(selectedMetric==="rating"?"active":"")} aria-expanded={selectedMetric==="rating"} onClick={()=>setSelectedMetric(selectedMetric==="rating"?"":"rating")}><span className="teacher-stat-icon" style={{display:"grid",placeItems:"center",alignSelf:"center",flex:"0 0 58px",width:58,height:58,minWidth:58,minHeight:58,fontSize:26,lineHeight:1,fontFamily:"Arial, sans-serif",textAlign:"center",boxSizing:"border-box"}}>☆</span><span className="teacher-stat-copy"><small>YOUR RATING</small><strong>{Number(analytics?.averageRating ?? 0).toFixed(1)} <i>/ 5</i></strong><em>{analytics?.reviews ?? 0} reviews</em></span><span className="teacher-stat-arrow">›</span></button>
        {selectedMetric && <DashboardOverlay
        title={selectedMetric==="enquiries"?"Student Enquiries":selectedMetric==="students"?"Connected Students":"Your Rating"}
        subtitle={selectedMetric==="enquiries"?`${consultations.length} student enquiries · Recent activity`:selectedMetric==="students"?`${analytics?.students ?? consultations.length} connected students · Your learners`:`${analytics?.reviews ?? 0} student reviews · Rating overview`}
        onClose={()=>setSelectedMetric("")}
      >
        <div className="teacher-metric-notification-content">
          {selectedMetric==="enquiries" && (consultations.length ? <div className="teacher-enquiry-modal-list">{consultations.map(c=><article className="teacher-enquiry-modal-item" key={c.id}>
            <div className="teacher-enquiry-modal-top">
              <div className="teacher-enquiry-person"><span className="teacher-enquiry-avatar">{(c.studentName || "S").slice(0,1).toUpperCase()}</span><div><strong>{c.studentName || "Student"}</strong><small>{c.email || c.studentProfile?.email || "Email not provided"}</small></div></div>
              <span className="teacher-enquiry-status-pill">{c.status || "NEW"}</span>
            </div>
            <div className="teacher-enquiry-message-card"><span>MESSAGE</span><p>{c.message || "The student is interested in your teaching profile."}</p></div>
            <div className="teacher-enquiry-modal-meta"><span><b>AGE</b>{c.studentProfile?.age || "—"}</span><span><b>ENGLISH LEVEL</b>{c.studentProfile?.englishLevel || "—"}</span></div>
            <div className="teacher-enquiry-modal-actions"><a className="teacher-contact-link" href={"mailto:"+encodeURIComponent(c.email || c.studentProfile?.email || "")+"?subject="+encodeURIComponent("Your English class enquiry")}>✉ <span>Contact student</span></a><button type="button" onClick={()=>setSelectedStudent(selectedStudent===c.id?null:c.id)}>{selectedStudent===c.id?"Hide details":"View learning profile"} <span>{selectedStudent===c.id?"⌃":"⌄"}</span></button>{["PENDING","REJECTED","NEW"].includes(String(c.status||"").toUpperCase())&&<button type="button" className="teacher-enquiry-delete" disabled={busy} onClick={()=>deleteEnquiry(c.id)}>Delete enquiry</button>}</div>
            {selectedStudent===c.id && <div className="teacher-enquiry-modal-profile"><div className="teacher-enquiry-profile-heading"><strong>Learning profile</strong><small>Student preferences and background</small></div>
              <div className="teacher-enquiry-profile-grid">
                <div><b>Age / Group</b><span>{c.studentProfile?.age || "—"} / {c.studentProfile?.ageGroup || "—"}</span></div>
                <div><b>English level</b><span>{c.studentProfile?.englishLevel || "—"}</span></div>
                <div><b>Learning goals</b><span>{c.studentProfile?.learningGoals || "—"}</span></div>
                <div><b>Preferred category</b><span>{c.studentProfile?.preferredCategory || "—"}</span></div>
                <div><b>Interests</b><span>{c.studentProfile?.interests || "—"}</span></div>
                <div><b>About</b><span>{c.studentProfile?.introduction || "—"}</span></div>
                {c.studentProfile?.guardianName && <div><b>Guardian</b><span>{c.studentProfile.guardianName} · {c.studentProfile.guardianPhone}</span></div>}
              </div>
            </div>}
          </article>)}</div> : <p className="teacher-stat-empty">No student enquiries yet.</p>)}
          {selectedMetric==="students" && (connectedStudents.length ? <><div className="teacher-student-count-summary"><button type="button" className={studentFilter==="ALL"?"is-selected":""} aria-pressed={studentFilter==="ALL"} onClick={()=>setStudentFilter(studentFilter==="ALL"?"":"ALL")}><strong>{analytics?.students ?? connectedStudents.length}</strong><span>Total connected</span><small>View all students</small></button><button type="button" className={studentFilter==="ACTIVE"?"is-selected":""} aria-pressed={studentFilter==="ACTIVE"} onClick={()=>setStudentFilter(studentFilter==="ACTIVE"?"":"ACTIVE")}><strong>{analytics?.activeStudents ?? connectedStudents.filter(s=>s.status==="ACTIVE").length}</strong><span>Active</span><small>View active learners</small></button><button type="button" className={studentFilter==="COMPLETED"?"is-selected":""} aria-pressed={studentFilter==="COMPLETED"} onClick={()=>setStudentFilter(studentFilter==="COMPLETED"?"":"COMPLETED")}><strong>{analytics?.completedStudents ?? connectedStudents.filter(s=>s.status==="COMPLETED").length}</strong><span>Completed</span><small>View completed</small></button></div>{studentFilter && <div className="teacher-stat-records-panel"><div className="teacher-stat-records-heading"><strong>{studentFilter==="ALL"?"All connected students":studentFilter==="ACTIVE"?"Active students":"Completed students"}</strong><button type="button" onClick={()=>setStudentFilter("")}>Hide details <span>⌃</span></button></div><div className="teacher-stat-records">{connectedStudents.filter(student=>studentFilter==="ALL"||student.status===studentFilter).map(student=><div className="teacher-stat-record" key={student.id}><div><strong>{student.name || "Student"}</strong><small>{student.email || "English learner"}</small></div><span className={student.status==="ACTIVE"?"is-active":"is-completed"}>{student.statusLabel || (student.status==="ACTIVE"?"Active student":"Completed student")}</span></div>)}{!connectedStudents.some(student=>studentFilter==="ALL"||student.status===studentFilter)&&<p className="teacher-stat-empty">No students in this group yet.</p>}</div></div>}</> : <p className="teacher-stat-empty">No connected students yet. A student appears here after you approve their enquiry.</p>)}
          {selectedMetric==="rating" && <div className="teacher-rating-summary"><strong>{Number(analytics?.averageRating ?? 0).toFixed(1)} <small>/ 5</small></strong><p>{analytics?.reviews ? `Based on ${analytics.reviews} student reviews.` : "You have no student reviews yet. Your rating will appear here after students leave feedback."}</p></div>}
        </div>
      </DashboardOverlay>}
      </section>
    </>}
    <div className="teacher-dashboard-content">
      <section className="teacher-dashboard-section teacher-profile-section-v2"><div className="teacher-dashboard-section-heading"><div><span className="teacher-dashboard-eyebrow">01 · YOUR PUBLIC LISTING</span><h2>Teacher Profile</h2><p>Help students and parents understand your experience, teaching approach and where to find your classes.</p></div></div>
              <form className="card teacher-profile-form teacher-profile-compact" onSubmit={saveProfile}>
        <div className="teacher-form-heading">
          <div><span className="teacher-form-kicker">PROFILE SETTINGS</span><h2>Edit your public profile</h2><p>Update the information students see before contacting you.</p></div>
          <span className="teacher-form-step">EDIT PROFILE</span>
        </div>
        <div className="teacher-profile-photo-field teacher-profile-photo-compact">
          <div className="teacher-photo-preview">{(imagePreview || profile.profileImageUrl) ? <img src={imagePreview || safeImageUrl(profile.profileImageUrl) || undefined} alt="Teacher profile preview" /> : <span>✦</span>}</div>
          <div className="teacher-photo-copy"><label>Profile picture</label><small>Use a clear photo · JPG, PNG or WebP · max 5 MB</small><label className="teacher-photo-upload">Choose photo<input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setProfileImage(f);setImagePreview(URL.createObjectURL(f));}}} /></label></div>
        </div>
        <div className="teacher-profile-accordions">
          <details className="teacher-profile-group">
            <summary><span className="teacher-profile-group-icon">01</span><span><strong style={{color:"#F5F8FF",fontSize:13,fontWeight:750}}>Basic profile</strong><small style={{color:"#C2D2E8",fontSize:11,fontWeight:500}}>Category, location and teaching specialty</small></span><i>⌄</i></summary>
            <div className="teacher-profile-fields teacher-profile-fields-basic">
              <label>Teaching category<select name="category" value={profile.category} onChange={change}>{["Kids English","Phonics","Speaking","Reading & Writing","Grammar","Storytelling","School English"].map(x=><option key={x}>{x}</option>)}</select></label>
              <label>Learning centre location / address<input name="location" value={profile.location ?? ""} onChange={change} /></label>
              <label>Specialty<input name="specialty" value={profile.specialty ?? ""} onChange={change} /></label>
              <label>Teaching experience<input name="experience" value={profile.experience ?? ""} onChange={change} /></label>
              <label>Teaching style<input name="teachingStyle" value={profile.teachingStyle ?? ""} onChange={change} /></label>
            </div>
          </details>
          <details className="teacher-profile-group">
            <summary><span className="teacher-profile-group-icon">02</span><span><strong style={{color:"#F5F8FF",fontSize:13,fontWeight:750}}>Teaching background</strong><small style={{color:"#C2D2E8",fontSize:11,fontWeight:500}}>Qualifications and your teaching introduction</small></span><i>⌄</i></summary>
            <div className="teacher-profile-fields teacher-profile-fields-background">
              <label>Qualifications<textarea name="qualification" value={profile.qualification || ""} onChange={change} rows={2} /></label>
              <label>About your teaching<textarea name="bio" value={profile.bio || ""} onChange={change} rows={2} /></label>
              <label>Issuing institution / certificate provider<input name="qualificationInstitution" value={profile.qualificationInstitution || ""} onChange={change} placeholder="e.g. University or certification body" /></label>
              <label>Qualification evidence <span className="teacher-field-hint">PDF, JPG or PNG · max 10 MB</span><input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={e=>setQualificationFile(e.target.files?.[0] || null)} /></label>
            </div>
          </details>
          <details className="teacher-profile-group">
            <summary><span className="teacher-profile-group-icon">03</span><span><strong style={{color:"#F5F8FF",fontSize:13,fontWeight:750}}>Class information</strong><small style={{color:"#C2D2E8",fontSize:11,fontWeight:500}}>Fees, duration, learner age and availability</small></span><i>⌄</i></summary>
            <div className="teacher-profile-fields teacher-profile-fields-class">
              <label>Teacher fee (optional)<input name="hourlyRate" type="number" value={profile.hourlyRate ?? ""} onChange={change} /></label>
              <label>Lesson duration (minutes)<input name="lessonDuration" type="number" value={profile.lessonDuration ?? ""} onChange={change} /></label>
              <label>Languages<input name="languages" value={profile.languages ?? ""} onChange={change} /></label>
              <label>Student age range<input name="ageRange" value={profile.ageRange ?? ""} onChange={change} /></label>
              <label>Teaching mode<input name="teachingMode" value={profile.teachingMode ?? ""} onChange={change} /></label>
              <label>Centre opening hours / weekly availability<input name="availability" value={profile.availability ?? ""} onChange={change} /></label>
            </div>
          </details>
        </div>
        {profile.qualificationDocumentUrl && <p className="teacher-current-document">Current document: <a href={safeExternalUrl(profile.qualificationDocumentUrl) || undefined} target="_blank" rel="noreferrer">View uploaded evidence</a></p>}
        <p className="teacher-privacy-note">Upload a teaching certificate or relevant degree. Do not upload passports or unrelated identity documents.</p>
        <div className="teacher-profile-footer"><span>Your profile information is saved securely.</span><button className="signup-btn" disabled={busy}>{busy ? "Saving..." : "Save profile"}</button></div>
      </form>      </section>
      {profile.verified && <section className="teacher-dashboard-section teacher-demo-section-v2"><div className="teacher-dashboard-section-heading"><div><span className="teacher-dashboard-eyebrow">02 · SHOW HOW YOU TEACH</span><h2>Demo Video Library</h2><p>Your free demo videos let students experience your teaching style before contacting you.</p></div></div>
                <div className="teacher-demo-library">
          <details className="teacher-demo-add">
            <summary className={videos.length>=2?"is-full":""}><span className="teacher-demo-add-icon">＋</span><span><strong>{videos.length>=2?"Demo video limit reached":"Add a demo video"}</strong><small>{videos.length}/2 videos added · YouTube or upload</small></span><span className="teacher-demo-add-chevron">⌄</span></summary>
            <form className="teacher-demo-card teacher-demo-card-compact" onSubmit={addVideo}>
              <p className="teacher-demo-intro">Add a short teaching demonstration.</p>
          <div className="teacher-demo-mode">
            <button type="button" className={videoMode==="youtube"?"signup-btn":"login-btn"} onClick={()=>setVideoMode("youtube")}>YouTube link</button>
            <button type="button" className={videoMode==="upload"?"signup-btn":"login-btn"} onClick={()=>setVideoMode("upload")}>Upload from device</button>
          </div>
          <label>Video title</label><input value={videoTitle} onChange={e=>setVideoTitle(e.target.value)} required className="teacher-demo-input" />
          {videoMode==="youtube" ? <>
            <label>YouTube URL</label><input type="url" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." required style={{ width:"100%", margin:"6px 0 12px" }} />
          </> : <>
            <label>Choose video file (MP4, WebM or MOV · max 100 MB)</label>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov" onChange={e=>setVideoFile(e.target.files?.[0] || null)} required className="teacher-demo-input teacher-demo-file" />
            {videoFile && <p className="teacher-demo-file-meta">{videoFile.name} · {(videoFile.size/1024/1024).toFixed(1)} MB</p>}
            {busy && <div style={{height:7,background:"#26334a",borderRadius:99,overflow:"hidden",margin:"10px 0"}}><div style={{height:"100%",width:videoUploadProgress+"%",background:"#8b9cff",transition:"width .2s"}} /></div>}
            {busy && <p className="teacher-demo-upload-meta">Uploading video… {videoUploadProgress}%</p>}
          </>}
          <p className="teacher-demo-upload-meta">Upload videos you own or are authorized to share. File size limits depend on the platform's upload service.</p>
          <button className="signup-btn teacher-demo-submit" disabled={busy || videos.length>=2}>{busy?(videoMode==="upload"?"Uploading...":"Saving..."):"Save demo video"}</button>
            </form>
          </details>
          <div className="teacher-demo-list">{videos.length===0 ? <div className="teacher-demo-empty">No demo videos yet. Add one to help students see your teaching style.</div> : videos.map(v=>{const videoId=getYouTubeVideoId(v.videoUrl);const isUploaded=v.videoType==="uploaded";return <article className="teacher-demo-item" key={v.id}><div className="teacher-demo-item-heading"><span className="teacher-demo-play">▶</span><div className="teacher-demo-item-copy"><strong>{v.title}</strong><small>{isUploaded?"Uploaded video":"YouTube demo"}</small></div><button type="button" disabled={busy} onClick={()=>deleteVideo(v.id)} className="teacher-demo-delete">Remove</button></div><details className="teacher-demo-preview"><summary>Watch preview</summary>{isUploaded ? <video controls playsInline preload="metadata" src={v.videoUrl} /> : videoId ? <iframe title={v.title} src={"https://www.youtube.com/embed/"+videoId} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /> : <p>Preview unavailable. <a href={safeExternalUrl(v.videoUrl) || undefined} target="_blank" rel="noreferrer">Watch video</a></p>}</details></article>})}</div>
        </div>
      </section>}
      <section className="teacher-dashboard-section teacher-dashboard-help"><div><span className="teacher-dashboard-eyebrow">GROW YOUR REACH</span><h2>More students start with a strong profile.</h2><p>Keep your centre information, course details and demo lessons accurate so families can make a confident choice.</p></div><button type="button" className="signup-btn" onClick={()=>document.querySelector(".teacher-profile-form")?.scrollIntoView({behavior:"smooth",block:"start"})}>Update my profile</button></section>
    </div>
  </WorkspaceShell></div>;
}

function AdminWorkspace({ currentUser, handleLogout }) {
  const [pendingTeachers,setPendingTeachers]=useState([]);
  const [allTeachers,setAllTeachers]=useState([]);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("ALL");
  const [activeMetric,setActiveMetric]=useState("");
  const [verificationOpen,setVerificationOpen]=useState(false);
  const [selectedApplication,setSelectedApplication]=useState(null);
  const headers={"Content-Type":"application/json",Authorization:`Bearer ${currentUser?.token||""}`};
  async function load(){
    setError("");
    try{
      const [pending,all]=await Promise.all([
        fetch(`${API_URL}/workspace/admin/pending-teachers`,{headers}),
        fetch(`${API_URL}/workspace/admin/teachers`,{headers})
      ]);
      setPendingTeachers(await readResponse(pending));
      setAllTeachers(await readResponse(all));
    }catch(e){setError(e.message||"Could not load teacher management data.");}
  }
  useEffect(()=>{load();},[]);
  async function approve(id){
    try{await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${id}/approve`,{method:"POST",headers}));setNotice("Teacher approved and published.");await load();}
    catch(e){setError(e.message);}
  }
  async function reject(id){
    const reason=window.prompt("Please enter the reason for rejecting this teacher application (maximum 1000 characters):");
    if(reason===null)return;
    const cleanReason=reason.trim();
    if(!cleanReason){setError("A rejection reason is required.");return;}
    if(cleanReason.length>1000){setError("The rejection reason must be 1000 characters or fewer.");return;}
    setError("");setNotice("");
    try{
      const response=await fetch(`${API_URL}/workspace/admin/teachers/${id}/reject`,{method:"POST",headers,body:JSON.stringify({reason:cleanReason})});
      const result=await readResponse(response);
      const rejectedAt=result?.rejectedAt||new Date().toISOString();
      const rejectedProfile=result?.teacher||result;
      // Update both views from the confirmed server response; do not block the transition
      // on a second list request that could fail after the rejection has already saved.
      setPendingTeachers(current=>current.filter(t=>String(t.id)!==String(id)));
      setAllTeachers(current=>{
        const exists=current.some(t=>String(t.id)===String(id));
        const updated={...(current.find(t=>String(t.id)===String(id))||{}),...(rejectedProfile||{}),id,available:false,rejectionReason:cleanReason,rejectedAt};
        return exists?current.map(t=>String(t.id)===String(id)?updated:t):[updated,...current];
      });
      setFilter("REJECTED");
      setQuery("");
      setActiveMetric("REJECTED");
      setNotice("Teacher application rejected and moved to Rejected. The reason has been saved.");
    }catch(e){setError(e.message||"Could not reject this teacher. Please retry.");}
  }
  async function hideProfile(t){
    if(!window.confirm(`Hide ${t.name}'s public teacher profile? The account and profile data will remain.`))return;
    try{await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${t.id}/hide`,{method:"PATCH",headers}));setNotice("Teacher profile hidden; it can be restored later.");await load();}
    catch(e){setError(e.message);}
  }
  async function deleteProfile(t){
    if(!window.confirm(`Permanently delete ${t.name}'s teacher profile? This cannot be undone. The login account and historical lesson records will remain.`))return;
    try{await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${t.id}`,{method:"DELETE",headers}));setNotice("Teacher profile permanently deleted.");await load();}
    catch(e){setError(e.message);}
  }
  async function restoreProfile(t){
    try{await readResponse(await fetch(`${API_URL}/workspace/admin/teachers/${t.id}/restore`,{method:"POST",headers}));setNotice("Teacher profile restored.");await load();}
    catch(e){setError(e.message);}
  }
  const published=allTeachers.filter(t=>t.verified&&t.available&&!t.rejectionReason).length;
  const rejected=allTeachers.filter(t=>Boolean(t.rejectionReason)).length;
  const hidden=allTeachers.filter(t=>!t.available&&!t.rejectionReason).length;
  const pendingCount=allTeachers.filter(t=>!t.verified&&t.available&&!t.rejectionReason).length;
  const metricProfiles=activeMetric==="PUBLISHED"?allTeachers.filter(t=>t.verified&&t.available&&!t.rejectionReason)
    :activeMetric==="HIDDEN"?allTeachers.filter(t=>!t.available&&!t.rejectionReason)
    :activeMetric==="PENDING"?allTeachers.filter(t=>!t.verified&&t.available&&!t.rejectionReason)
    :activeMetric==="REJECTED"?allTeachers.filter(t=>Boolean(t.rejectionReason)):allTeachers;
  const metricTitle=activeMetric==="PUBLISHED"?"Published teachers":activeMetric==="HIDDEN"?"Hidden profiles":activeMetric==="PENDING"?"Awaiting review":activeMetric==="REJECTED"?"Rejected applications":"All teacher profiles";
  const matchesFilter=t=>filter==="ALL"||(filter==="PUBLISHED"&&t.verified&&t.available&&!t.rejectionReason)||(filter==="PENDING"&&!t.verified&&t.available&&!t.rejectionReason)||(filter==="HIDDEN"&&!t.available&&!t.rejectionReason)||(filter==="REJECTED"&&Boolean(t.rejectionReason));
  const visibleProfiles=metricProfiles.filter(t=>{
    const q=query.trim().toLowerCase();
    return (!q||[t.name,t.category,t.location,t.ownerEmail,t.rejectionReason].filter(Boolean).some(v=>String(v).toLowerCase().includes(q)))&&matchesFilter(t);
  });
  return <div className="admin-dashboard-redesign admin-command-center">
    <WorkspaceShell title="Admin Dashboard" subtitle="Manage the English teacher discovery platform" user={currentUser} onLogout={handleLogout}>
      <div className="admin-welcome-row">
        <div><p className="admin-eyebrow">SEONBAEON · PLATFORM CONTROL</p><h1>Good to see you, Admin.</h1><p>Keep teacher profiles trusted, demo content appropriate and the discovery experience running smoothly.</p></div>
        <button type="button" className="admin-refresh-btn" onClick={load}>↻ <span>Refresh</span></button>
      </div>
      {notice&&<div className="admin-feedback success" role="status">{notice}</div>}
      {error&&<div className="admin-feedback error" role="alert">{error}</div>}
      <div className="admin-metric-grid">
        <button type="button" className="admin-metric-card" onClick={()=>{setFilter("ALL");setQuery("");setActiveMetric("ALL");}}><span className="admin-metric-icon">♙</span><small>Teacher profiles</small><strong>{allTeachers.length}</strong><span className="admin-metric-note">Click to view all profiles <b>↗</b></span></button>
        <button type="button" className="admin-metric-card" onClick={()=>{setFilter("PUBLISHED");setQuery("");setActiveMetric("PUBLISHED");}}><span className="admin-metric-icon">✓</span><small>Published teachers</small><strong>{published}</strong><span className="admin-metric-note">Visible to students <b>↗</b></span></button>
        <button type="button" className="admin-metric-card" onClick={()=>{setFilter("PENDING");setQuery("");setActiveMetric("PENDING");}}><span className="admin-metric-icon">◷</span><small>Awaiting review</small><strong>{pendingTeachers.length||pendingCount}</strong><span className="admin-metric-note">Open verification queue <b>↗</b></span></button>
        <button type="button" className="admin-metric-card" onClick={()=>{setFilter("HIDDEN");setQuery("");setActiveMetric("HIDDEN");}}><span className="admin-metric-icon">⌁</span><small>Hidden profiles</small><strong>{hidden}</strong><span className="admin-metric-note">Review and restore profiles <b>↗</b></span></button>
        <button type="button" className="admin-metric-card rejected" onClick={()=>{setFilter("REJECTED");setQuery("");setActiveMetric("REJECTED");}}><span className="admin-metric-icon">×</span><small>Rejected</small><strong>{rejected}</strong><span className="admin-metric-note">View rejection reasons <b>↗</b></span></button>
      </div>
      {activeMetric&&<div className="admin-profile-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setActiveMetric("");}}>
        <section className="admin-profile-modal" role="dialog" aria-modal="true" aria-labelledby="admin-profile-modal-title">
          <div className="admin-profile-modal-heading"><div><p className="admin-eyebrow">PROFILE MANAGEMENT</p><h2 id="admin-profile-modal-title">{metricTitle}</h2><p>{visibleProfiles.length} {visibleProfiles.length===1?"profile":"profiles"} · Manage teacher applications and profile visibility.</p></div><button type="button" aria-label="Close profile details" onClick={()=>setActiveMetric("")}>×</button></div>
          <div className="admin-profile-modal-filters"><input aria-label="Search profiles" placeholder="Search teacher name, category, email or rejection reason..." value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="Filter profile status" value={filter} onChange={e=>setFilter(e.target.value)}><option value="ALL">All statuses</option><option value="PUBLISHED">Published</option><option value="PENDING">Pending</option><option value="HIDDEN">Hidden</option><option value="REJECTED">Rejected</option></select></div>
          <div className="admin-profile-modal-list">{visibleProfiles.length===0?<div className="admin-empty-panel"><strong>No profiles in this view</strong><p>Try another status or search term.</p></div>:visibleProfiles.map(t=>{
            const isRejected=Boolean(t.rejectionReason);
            const statusLabel=isRejected?"Rejected":t.verified&&t.available?"Published":t.available?"Pending":"Hidden";
            const statusClass=isRejected?"rejected":t.verified&&t.available?"published":t.available?"pending":"hidden";
            return <article className="admin-profile-modal-row" key={t.id}>
              <div className="admin-teacher-avatar small">{(t.name||"T").trim().charAt(0).toUpperCase()}</div>
              <div className="admin-profile-modal-identity"><strong>{t.name||"English teacher"}</strong><span>{t.category||"English"} · {t.location||"Location not provided"}</span><small>{t.ownerEmail||"No linked email"}</small>{isRejected&&<p className="admin-rejection-reason"><b>Rejection reason:</b> {t.rejectionReason}<small>{t.rejectedAt?`Rejected ${new Date(t.rejectedAt).toLocaleString()}`:"Rejection date unavailable"}</small></p>}</div>
              <span className={`admin-state ${statusClass}`}>{statusLabel}</span>
              <div className="admin-profile-modal-actions">{!t.available?<button type="button" className="admin-row-action" onClick={()=>restoreProfile(t)}>Restore profile</button>:t.verified?<button type="button" className="admin-row-action danger" onClick={()=>hideProfile(t)}>Hide profile</button>:!isRejected?<><button type="button" className="admin-approve-btn" onClick={()=>approve(t.id)}>Approve</button><button type="button" className="admin-reject-btn" onClick={()=>reject(t.id)}>Reject</button></>:null}<button type="button" className="admin-row-action danger" onClick={()=>deleteProfile(t)}>Delete permanently</button></div>
            </article>;
          })}</div>
          <div className="admin-profile-modal-footer"><span>Hide preserves the profile. Permanent delete removes the teacher profile and related reviews/applications.</span><button type="button" onClick={()=>setActiveMetric("")}>Done</button></div>
        </section>
      </div>}
      <section className={`admin-panel-section admin-verification-section ${verificationOpen?"is-open":"is-closed"}`}>
        <button type="button" className="admin-panel-heading admin-verification-toggle" aria-expanded={verificationOpen} onClick={()=>setVerificationOpen(value=>!value)}>
          <span className="admin-verification-heading-copy"><p className="admin-eyebrow">QUALITY & TRUST</p><strong>Teacher verification</strong><small>Review credentials and sample lessons before publishing a teacher.</small></span>
          <span className="admin-verification-toggle-action"><span className="admin-pending-dot" aria-hidden="true"></span>{pendingTeachers.length} pending <b>{verificationOpen?"−":"↗"}</b></span>
        </button>
        {verificationOpen&&<div className="admin-application-list">{pendingTeachers.length===0?<div className="admin-empty-panel"><span>✓</span><strong>You're all caught up</strong><p>There are no teacher applications waiting for review.</p></div>:pendingTeachers.map((t,index)=><button type="button" className="admin-application-toggle admin-application-launch" key={t.id} onClick={()=>setSelectedApplication(t.id)}>
          <span className="admin-application-main"><span className="admin-teacher-avatar">{(t.name||"T").trim().charAt(0).toUpperCase()}</span><span className="admin-application-info"><strong>{t.name||"English teacher"}</strong><span>{t.category||"English"} · {t.location||"Location not provided"} · {t.experience||"Experience not provided"}</span><small>{t.ownerEmail||"No linked email"}</small></span></span>
          <span className="admin-application-toggle-meta"><span className="admin-application-number">Application {String(index+1).padStart(2,"0")}</span><span className="admin-application-chevron">↗</span></span>
        </button>)}</div>}
      </section>
      {selectedApplication!==null&&(()=>{const t=pendingTeachers.find(item=>String(item.id)===String(selectedApplication));return t?<div className="admin-application-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setSelectedApplication(null);}}>
        <section className="admin-application-modal" role="dialog" aria-modal="true" aria-labelledby="admin-application-modal-title">
          <div className="admin-application-modal-heading"><div><p className="admin-eyebrow">TEACHER APPLICATION · REVIEW</p><h2 id="admin-application-modal-title">{t.name||"English teacher"}</h2><p>{t.category||"English"} · {t.location||"Location not provided"} · {t.experience||"Experience not provided"}</p></div><button type="button" aria-label="Close application" onClick={()=>setSelectedApplication(null)}>×</button></div>
          <div className="admin-application-modal-body">
            <div className="admin-application-details"><div><small>Qualification</small><strong>{t.qualification||"Not provided"}</strong></div><div><small>Institution</small><strong>{t.qualificationInstitution||"Not provided"}</strong></div></div>
            <div className="admin-application-meta"><span>{t.ownerEmail||"No linked email"}</span><span>{t.experience||"Experience not provided"}</span></div>
            {t.bio&&<p className="admin-application-bio">{t.bio}</p>}
            <div className="admin-evidence-row">{t.qualificationDocumentUrl?<a href={safeExternalUrl(t.qualificationDocumentUrl) || undefined} target="_blank" rel="noreferrer">↗ View qualification document</a>:<span className="admin-evidence-missing">Qualification document not uploaded</span>}{(t.videos||[]).map(v=><a key={v.id} href={safeExternalUrl(v.videoUrl) || undefined} target="_blank" rel="noreferrer">▶ {v.title||"Demo video"}</a>)}</div>
          </div>
          <div className="admin-application-modal-actions"><button type="button" className="admin-approve-btn" onClick={()=>{setSelectedApplication(null);approve(t.id);}}>Approve teacher</button><button type="button" className="admin-reject-btn" onClick={()=>{setSelectedApplication(null);reject(t.id);}}>Reject</button></div>
        </section>
      </div>:null;})()}
      <AdminToolsPanel user={currentUser}/>
    </WorkspaceShell>
  </div>;
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


function AuthGate({ onLogin, onSignup }) {
  return <main className="auth-page"><section className="auth-card auth-gate-card">
    <div className="auth-heading"><div className="auth-logo">Pick My Teacher<span>.</span></div>
      <h1>Create an account to explore teachers</h1>
      <p>Teacher profiles, teaching details and demo lessons are available to registered members. Sign in or create a free account to continue.</p>
    </div>
    <button className="auth-submit" onClick={onLogin}>Login to continue →</button>
    <button className="signup-btn" onClick={onSignup}>Create free account</button>
  </section></main>;
}

function PolicyPage({ type, onBack }) {
  const privacy = type === "privacy";
  return <main className="policy-page">
    <article className="policy-document">
      <button className="back-home" onClick={onBack}>← Back</button>
      <p className="small-title">PICK MY TEACHER · {privacy ? "PRIVACY" : "LEGAL"}</p>
      <h1>{privacy ? "Privacy Policy" : "Terms of Service"}</h1>
      <p className="policy-updated">Draft for review · Last updated: November 9, 2026</p>
      {privacy ? <>
        <h2>1. Information we collect</h2><p>When you create or use an account, we may collect your name, email address, account role, profile information, learning preferences, teacher application details, consultation requests, lessons, reviews, messages and information you choose to upload. We also receive basic technical and usage information needed to operate, secure and troubleshoot the service.</p>
        <h2>2. How we use information</h2><p>We use information to create and manage accounts, display teacher profiles to authenticated members, review teacher applications, facilitate student–teacher enquiries and lessons, provide notifications, support account security, prevent abuse and improve the service.</p>
        <h2>3. Information visibility and sharing</h2><p>Information is shared with the relevant students, teachers and administrators when needed to operate the marketplace. Teacher profile information is intended for registered users. We may use infrastructure and service providers for hosting, database, file storage, email and security. We do not sell personal information.</p>
        <h2>4. Children and parents</h2><p>The service may be used by parents or guardians arranging English lessons for children. A parent or guardian should provide information about a child and manage the child's use of the service. Do not submit unnecessary sensitive information about a child.</p>
        <h2>5. Retention and security</h2><p>We retain information while an account is active and as reasonably needed for service delivery, security, dispute resolution and legal obligations. We use reasonable technical and organisational safeguards, but no online service can guarantee absolute security.</p>
        <h2>6. Your choices and account deletion</h2><p>You may update available profile information and request account deletion through the account controls. Some records may need to be retained where required for legitimate operational, security or legal reasons. Deletion may remove access to the service and related account data.</p>
        <h2>7. Cookies and local storage</h2><p>The application uses browser storage to maintain your login session and preferences. Clearing browser storage may sign you out or reset preferences.</p>
        <h2>8. Changes and contact</h2><p>We may update this policy as the service changes. For privacy questions or requests, contact the service operator using the official support contact published by Pick My Teacher.</p>
      </> : <>
        <h2>1. About the service</h2><p>Pick My Teacher helps users discover English teachers and manage teacher enquiries and learning arrangements. The service is a matching and communication platform; it does not itself guarantee teaching outcomes or the conduct, availability or qualifications of any user.</p>
        <h2>2. Accounts</h2><p>You must provide accurate information, keep your login credentials secure and use only your own account. You are responsible for activity carried out through your account. You must notify the service operator if you suspect unauthorised access.</p>
        <h2>3. Students, parents and children</h2><p>Parents or legal guardians are responsible for creating and managing accounts and arrangements for children who are not legally able to consent independently. Do not arrange unsupervised contact with a child through the platform.</p>
        <h2>4. Teachers and applications</h2><p>Teacher applicants must provide truthful profile, identity and qualification information and may be asked to provide supporting documents. Profiles may be reviewed, approved, rejected, hidden or removed by administrators. Approval is not a guarantee of employment, student enrolment or income.</p>
        <h2>5. Acceptable use</h2><p>You must not impersonate another person, submit misleading credentials, harass users, misuse personal information, upload unlawful or harmful material, attempt unauthorised access, interfere with the service or use the platform for purposes unrelated to legitimate English-learning arrangements.</p>
        <h2>6. Enquiries, lessons and payments</h2><p>Users are responsible for confirming lesson schedules, fees, cancellation terms and any payment arrangements directly and clearly before a lesson. Unless expressly stated otherwise in the service, Pick My Teacher does not process or guarantee payments between users.</p>
        <h2>7. Content and reviews</h2><p>You remain responsible for content you submit and must have the rights and permissions needed to share it. You grant the service permission to host and display submitted content as necessary to operate the platform. Reviews must be honest, relevant and non-abusive.</p>
        <h2>8. Suspension and termination</h2><p>We may restrict or suspend accounts or content where reasonably necessary to protect users, enforce these terms, investigate abuse or comply with law. You may request account deletion using the available account controls.</p>
        <h2>9. Disclaimers and liability</h2><p>The service is provided on an availability basis. To the extent permitted by applicable law, we do not guarantee uninterrupted access, user conduct, teaching outcomes or the accuracy of user-submitted information. Nothing in these terms excludes rights or liabilities that cannot lawfully be excluded.</p>
        <h2>10. Changes and contact</h2><p>We may update these terms and will publish the revised version here. Continued use after an update takes effect constitutes acceptance where permitted by applicable law. Questions should be sent using the official support contact published by Pick My Teacher.</p>
      </>}
      <p className="policy-notice">Important: This is a general starter draft, not jurisdiction-specific legal advice. Before opening registration publicly, the operator must add the legal business/operator name, country and governing law, a monitored privacy contact, the actual third-party processors and retention details, and obtain a local legal review—especially for services involving children.</p>
    </article>
  </main>;
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
          <p style={{ color: "#b87325", fontWeight: 700 }}>ANDROID APP · VERSION 1.1</p>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 58px)", lineHeight: 1.1, margin: "20px 0" }}>
            Your learning journey, one tap away.
          </h1>
          <p style={{ color: "#666", fontSize: 17, lineHeight: 1.8, marginBottom: 26 }}>
            Find the right English teacher for your learning goals with Pick My Teacher.
          </p>
          <a
            href="/app"
            style={{ display: "inline-block", background: "#222", color: "#fff", padding: "16px 24px", borderRadius: 10, textDecoration: "none", fontWeight: 700 }}
          >
            ↓ Download for Android
          </a>
          <p style={{ color: "#777", fontSize: 13, marginTop: 12 }}>APK · Android · Version 1.1</p>
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

      <footer style={{ padding: 28, textAlign: "center", color: "#777", fontSize: 13, background: "#fff", borderTop: "1px solid #eee" }}>
        <p style={{ marginBottom: 10 }}>© {new Date().getFullYear()} Pick My Teacher</p>
        <a href="/" style={{ color: "#222", fontWeight: 700, textDecoration: "none" }}>Visit Pick My Teacher Website →</a>
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
  const [afterLoginPage, setAfterLoginPage] = useState("dashboard");
  const [policyType, setPolicyType] = useState("privacy");

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

  if (window.location.pathname === "/app") {
    window.location.replace("https://github.com/shormydas09-bit/seonbaeon-frontend/releases/latest/download/Pick-My-Teacher.apk");
    return null;
  }

  if (window.location.pathname === "/download") {
    return <DownloadPage />;
  }

  if (window.location.pathname === "/reset-password") {
    return <ResetPasswordPage />;
  }

  function openLogin(nextPage = "dashboard") {
    setAfterLoginPage(nextPage);
    setAuthMode("login");
    setPage("auth");
  }

  function openSignup(nextPage = "dashboard") {
    setAfterLoginPage(nextPage);
    setAuthMode("signup");
    setPage("auth");
  }

  function handleLogin(user) {
    localStorage.setItem(
      USER_KEY,
      JSON.stringify(user)
    );

    setCurrentUser(user);
    setPage(afterLoginPage === "teachers" ? "teachers" : user.role === "TEACHER" ? "teacher-dashboard" : user.role === "ADMIN" ? "admin-dashboard" : "dashboard");
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

      {page === "policy" && <PolicyPage type={policyType} onBack={() => setPage("auth")} />}

      {page === "home" && (
        <HomePage
          goToTeachers={() =>
            setPage("teachers")
          }
        />
      )}

      {page === "teachers" && !currentUser && (
        <AuthGate onLogin={() => openLogin("teachers")} onSignup={() => openSignup("teachers")} />
      )}

      {page === "teachers" && currentUser && (
        <TeacherSearch
          goHome={() =>
            setPage("home")
          }
          currentUser={currentUser}
          openProfile={(teacher) => {
            setSelectedTeacher(teacher);
            setPage("profile");
          }}
        />
      )}

      {page === "profile" && !currentUser && <AuthGate onLogin={() => openLogin("teachers")} onSignup={() => openSignup("teachers")} />}

      {page === "profile" && currentUser && (
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
        <AuthPage mode={authMode} setMode={setAuthMode} onLogin={handleLogin} onPolicyOpen={(type) => { setPolicyType(type); setPage("policy"); }} />
      )}

      {(page === "home" || page === "teachers" || page === "auth") && <footer className="site-legal-footer"><span>© {new Date().getFullYear()} Pick My Teacher</span><button onClick={() => { setPolicyType("privacy"); setPage("policy"); }}>Privacy Policy</button><button onClick={() => { setPolicyType("terms"); setPage("policy"); }}>Terms of Service</button></footer>}
    </div>
  );
}

export default App;


