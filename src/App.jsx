
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = "https://seonbaeon-backend-1.onrender.com/api";
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

      const endpoint =
        mode === "signup" ? "/users/signup" : "/users/login";

      const body =
        mode === "signup"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

          <button
            className="auth-submit"
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢"
              : "Create Account ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢"}
          </button>
        </form>

        <div className="auth-switch">
          {mode === "login" ? (
            <>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("signup")}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("login")}
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
  return (
    <>
      <section className="hero-section" id="home">
        <div className="hero-content">
          <p className="small-title">
            FIND THE RIGHT ENGLISH TEACHER
          </p>

          <h1>
            Know your teacher
            <br />
            <span>before you join.</span>
          </h1>

          <p className="hero-text">
            Discover English teachers for Korean children, explore
            qualifications, read reviews, and watch sample demo
            lessons before choosing.
          </p>

          <div className="hero-buttons">
            <button
              className="primary-btn"
              onClick={goToTeachers}
            >
              Find a Teacher
            </button>

            <button
              className="secondary-btn"
              onClick={() =>
                document
                  .getElementById("how")
                  ?.scrollIntoView({
                    behavior: "smooth",
                  })
              }
            >
              How It Works
            </button>
          </div>

          <div className="trust-info">
            <div>
              <strong>Profile</strong>
              <span>Know your teacher</span>
            </div>

            <div>
              <strong>Reviews</strong>
              <span>Hear from students</span>
            </div>

            <div>
              <strong>Demo</strong>
              <span>See the teaching style</span>
            </div>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-top">
            <span className="online">Available</span>
            <span>4.9 rating</span>
          </div>

          <div className="mentor-avatar" aria-hidden="true">PMT</div>

          <h2>English Teacher</h2>

          <p className="mentor-subtitle">
            Kids English & Phonics
          </p>

          <div className="mentor-details">
            <div>
              <strong>8+</strong>
              <span>Years Experience</span>
            </div>

            <div>
              <strong>250+</strong>
              <span>Students</span>
            </div>

            <div>
              <strong>98%</strong>
              <span>Positive Reviews</span>
            </div>
          </div>

          <button
            className="view-profile"
            onClick={goToTeachers}
          >
            View Teacher Profile
          </button>
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

          <button onClick={goToTeachers}>
            Search Teachers
          </button>
        </div>
      </section>

      <section className="how-section" id="how">
        <p className="small-title">
          HOW PICK MY TEACHER WORKS
        </p>

        <h2>
          Make a better decision
          <br />
          <span>before you commit.</span>
        </h2>

        <div className="steps">
          <div className="step">
            <div className="step-number">01</div>
            <h3>Find</h3>
            <p>
              Search English teachers based on location and
              learning needs.
            </p>
          </div>

          <div className="step">
            <div className="step-number">02</div>
            <h3>Watch</h3>
            <p>
              Watch a sample demo lesson and understand the
              teaching style.
            </p>
          </div>

          <div className="step">
            <div className="step-number">03</div>
            <h3>Trust</h3>
            <p>
              Check qualifications and read reviews from
              previous students.
            </p>
          </div>

          <div className="step">
            <div className="step-number">04</div>
            <h3>Choose</h3>
            <p>
              Compare English teachers and choose with more
              confidence.
            </p>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <h2>Don't choose a class blindly.</h2>

        <p>
          See the teacher. Feel the style. Choose with
          confidence.
        </p>

        <button
          className="primary-btn"
          onClick={goToTeachers}
        >
          Explore English Teachers
        </button>
      </section>

      <footer>
        <div className="logo">
          Pick My Teacher<span>.</span>
        </div>

        <p>Know the teacher before joining the class.</p>

        <p className="copyright">
          Ãƒâ€šÃ‚Â© 2026 Pick My Teacher. All rights reserved.
        </p>
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

  useEffect(() => {
    async function loadTeachers() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/teachers`
        );

        const data = await readResponse(response);

        setTeachers(Array.isArray(data) ? data : (Array.isArray(data?.teachers) ? data.teachers : (Array.isArray(data?.content) ? data.content : [])));
      } catch (err) {
        setError(
          err.message ||
            "Could not connect to the backend."
        );
      } finally {
        setLoading(false);
      }
    }

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
    <div className="teachers-page">
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
                      ? "ÃƒÂ¢Ã¢â€žÂ¢Ã‚Â¥"
                      : "ÃƒÂ¢Ã¢â€žÂ¢Ã‚Â¡"}
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
                      {teacher.rating ? `${teacher.rating} rating` : "Rating unavailable"}
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
    return `â‚©${Number(value).toLocaleString()}/hour`;
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
          Ã—
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
                  <span aria-hidden="true">â˜…</span>{" "}
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

  const [reviewName, setReviewName] = useState(
    currentUser?.name || ""
  );

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

    if (
      !reviewName.trim() ||
      !reviewText.trim()
    ) {
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
          },
          body: JSON.stringify({
            studentName:
              reviewName.trim(),
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
    <div className="profile-page">
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
                ÃƒÆ’Ã¢â‚¬â€
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
                      ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“ Verified
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
                {isFavorite ? "ÃƒÂ¢Ã¢â€žÂ¢Ã‚Â¥" : "ÃƒÂ¢Ã¢â€žÂ¢Ã‚Â¡"}
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
                  <strong>ÃƒÂ¢Ã‹Å“Ã¢â‚¬Â¦ {teacher.rating}</strong>
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
                  <div><span>Hourly Rate</span><strong>ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â©{Number(teacher.hourlyRate).toLocaleString()}</strong></div>
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
                          Watch Demo Class ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢
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
                              <span className="video-play-badge" aria-hidden="true">ÃƒÂ¢Ã¢â‚¬â€œÃ‚Â¶</span>
                            </div>

                            <div className="video-gallery-info">
                              <strong>
                                {video.title ||
                                  `Demo ${index + 1}`}
                              </strong>

                              <span>
                                Watch sample ÃƒÂ¢Ã¢â‚¬Â Ã¢â‚¬â„¢
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
                  </div>
                ))}

              <div className="review-form-card">
                <h3>Write a Review</h3>

                <form
                  onSubmit={submitReview}
                >
                  <input
                    value={reviewName}
                    onChange={(e) =>
                      setReviewName(
                        e.target.value
                      )
                    }
                    placeholder="Your name"
                    required
                  />

                  <select
                    value={reviewRating}
                    onChange={(e) =>
                      setReviewRating(
                        Number(
                          e.target.value
                        )
                      )
                    }
                  >
                    <option value="5">5 / 5</option>

                    <option value="4">4 / 5</option>

                    <option value="3">3 / 5</option>

                    <option value="2">2 / 5</option>

                    <option value="1">1 / 5</option>
                  </select>

                  <textarea
                    value={reviewText}
                    onChange={(e) =>
                      setReviewText(
                        e.target.value
                      )
                    }
                    rows="4"
                    placeholder="Share your experience..."
                    required
                  />

                  <button
                    className="submit-consultation"
                    type="submit"
                    disabled={
                      reviewSubmitting
                    }
                  >
                    {reviewSubmitting
                      ? "Submitting..."
                      : "Submit Review"}
                  </button>
                </form>
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
                  <strong>ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â©{Number(teacher.hourlyRate).toLocaleString()}</strong>
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

function StudentDashboard({
  currentUser,
  goToTeachers,
  handleLogout,
}) {
  return (
    <main className="page">
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
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(250px, 1fr))",
            gap: "20px",
            marginBottom: "32px",
          }}
        >
          <div className="card">
            <div className="dashboard-card-label">ACCOUNT</div>

            <h3>My Profile</h3>

            <p>
              <strong>Name:</strong>{" "}
              {currentUser?.name || "Student"}
            </p>

            <p>
              <strong>Email:</strong>{" "}
              {currentUser?.email || "Not available"}
            </p>

            <p>
              <strong>Account:</strong> Student
            </p>
          </div>

          <div className="card">
            <div className="dashboard-card-label">DISCOVER</div>

            <h3>Find English Teachers</h3>

            <p>
              Explore English teachers for speaking,
              phonics, grammar, reading, storytelling
              and school English.
            </p>

            <button
              className="signup-btn"
              onClick={goToTeachers}
            >
              Find Teachers
            </button>
          </div>

          <div className="card">
            <div className="dashboard-card-label">REQUESTS</div>

            <h3>Consultations</h3>

            <p>
              Your consultation and lesson requests
              will appear here.
            </p>

            <span
              style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "#f3f4f6",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Coming next
            </span>
          </div>

          <div className="card">
            <div className="dashboard-card-label">SAVED</div>

            <h3>Favorite Teachers</h3>

            <p>
              Your saved teachers will appear here so
              you can easily find them again.
            </p>

            <span
              style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "6px 10px",
                borderRadius: "999px",
                background: "#f3f4f6",
                color: "#6b7280",
                fontSize: "13px",
              }}
            >
              Coming next
            </span>
          </div>
        </div>

        <div className="card">
          <h2>English Learning Categories</h2>

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

      {page === "dashboard" && currentUser && (
        <StudentDashboard
          currentUser={currentUser}
          goToTeachers={() =>
            setPage("teachers")
          }
          handleLogout={handleLogout}
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












