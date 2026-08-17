/* =========================================================
   StudyRank
   GitHub Pages + Supabase

   IMPORTANT:
   Supabase URL must NOT contain /rest/v1/
========================================================= */


/* =========================================================
   SUPABASE
========================================================= */

const SUPABASE_URL =
  "https://yzlmzgkbrpugukzqbbie.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_pYwcnBryBcOtCiK5RERs_g_mf_HHRU_";


const { createClient } =
  window.supabase;


const supabase =
  createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );



/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;

let currentProfile = null;

let subjects = [];

let todos = [];

let currentSession = null;

let selectedSubjectId = null;

let editingSubjectId = null;

let editingTodoId = null;

let selectedColor = "#6366f1";

let timerInterval = null;

let currentTodoFilter = "all";

let currentRankingPeriod = "today";

let appStarting = false;



/* =========================================================
   DOM HELPERS
========================================================= */

function $(selector) {
  return document.querySelector(selector);
}


function $$(selector) {
  return document.querySelectorAll(selector);
}



/* =========================================================
   START
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  initialize
);


async function initialize() {

  bindEvents();

  const {
    data,
    error
  } =
    await supabase.auth.getSession();


  if (error) {

    console.error(
      "getSession error:",
      error
    );

    showAuth();

    return;

  }


  if (data?.session?.user) {

    currentUser =
      data.session.user;

    await startApp();

  } else {

    showAuth();

  }

}



/* =========================================================
   AUTH SCREEN
========================================================= */

function showAuth() {

  $("#auth-screen")
    ?.classList.remove("hidden");

  $("#app-screen")
    ?.classList.add("hidden");

}


function showApp() {

  $("#auth-screen")
    ?.classList.add("hidden");

  $("#app-screen")
    ?.classList.remove("hidden");

}



/* =========================================================
   AUTH FORM
========================================================= */

function showSignupForm() {

  $("#login-form")
    ?.classList.add("hidden");

  $("#signup-form")
    ?.classList.remove("hidden");

}


function showLoginForm() {

  $("#signup-form")
    ?.classList.add("hidden");

  $("#login-form")
    ?.classList.remove("hidden");

}



/* =========================================================
   LOGIN
========================================================= */

async function login() {

  const email =
    $("#login-email")
      .value
      .trim();

  const password =
    $("#login-password")
      .value;


  if (!email || !password) {

    toast(
      "이메일과 비밀번호를 입력해주세요."
    );

    return;

  }


  const button =
    $("#login-btn");


  button.disabled = true;

  button.textContent =
    "로그인 중...";


  const {
    data,
    error
  } =
    await supabase.auth.signInWithPassword({

      email,

      password

    });


  button.disabled = false;

  button.textContent =
    "로그인";


  if (error) {

    console.error(
      "login error:",
      error
    );

    toast(
      authErrorMessage(error)
    );

    return;

  }


  currentUser =
    data.user;


  await startApp();

}



/* =========================================================
   SIGNUP
========================================================= */

async function signup() {

  const name =
    $("#signup-name")
      .value
      .trim();


  const email =
    $("#signup-email")
      .value
      .trim();


  const password =
    $("#signup-password")
      .value;


  const school =
    $("#signup-school")
      .value
      .trim();


  const grade =
    Number(
      $("#signup-grade").value
    );


  const classNumber =
    Number(
      $("#signup-class").value
    );


  if (
    !name ||
    !email ||
    !password ||
    !school ||
    !grade ||
    !classNumber
  ) {

    toast(
      "모든 정보를 입력해주세요."
    );

    return;

  }


  if (
    password.length < 6
  ) {

    toast(
      "비밀번호는 6자 이상이어야 합니다."
    );

    return;

  }


  if (
    grade < 1 ||
    grade > 12
  ) {

    toast(
      "학년을 확인해주세요."
    );

    return;

  }


  if (
    classNumber < 1 ||
    classNumber > 100
  ) {

    toast(
      "반을 확인해주세요."
    );

    return;

  }


  const button =
    $("#signup-btn");


  button.disabled = true;

  button.textContent =
    "가입 중...";


  const {
    data,
    error
  } =
    await supabase.auth.signUp({

      email,

      password,

      options: {

        data: {

          name,

          school,

          grade,

          class_number:
            classNumber

        }

      }

    });


  button.disabled = false;

  button.textContent =
    "회원가입";


  if (error) {

    console.error(
      "signup error:",
      error
    );

    toast(
      authErrorMessage(error)
    );

    return;

  }


  if (!data?.user) {

    toast(
      "회원가입에 실패했습니다."
    );

    return;

  }


  /*
   * Supabase에서 이메일 확인을 켜둔 경우
   * 가입 직후 session이 없을 수 있다.
   */

  if (!data.session) {

    toast(
      "가입되었습니다. 이메일 인증 후 로그인해주세요."
    );

    showLoginForm();

    return;

  }


  currentUser =
    data.user;


  /*
   * profiles가 자동 생성되는 DB 구조라면
   * 이미 존재하므로 그대로 사용한다.
   *
   * 자동 생성되지 않는 구조라면
   * 여기서 직접 생성한다.
   */

  await ensureProfile({

    id:
      data.user.id,

    name,

    school,

    grade,

    class_number:
      classNumber

  });


  await ensureDefaultSubjects();

  await startApp();

}



/* =========================================================
   AUTH ERROR
========================================================= */

function authErrorMessage(error) {

  const message =
    String(
      error?.message || ""
    );


  if (
    message.includes(
      "Invalid login credentials"
    )
  ) {

    return (
      "이메일 또는 비밀번호가 올바르지 않습니다."
    );

  }


  if (
    message.includes(
      "Email not confirmed"
    )
  ) {

    return (
      "이메일 인증이 필요합니다."
    );

  }


  if (
    message.includes(
      "User already registered"
    )
  ) {

    return (
      "이미 가입된 이메일입니다."
    );

  }


  return message ||
    "오류가 발생했습니다.";

}



/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  stopTimer();

  await supabase.auth.signOut();

  currentUser = null;

  currentProfile = null;

  subjects = [];

  todos = [];

  currentSession = null;

  selectedSubjectId = null;

  showAuth();

}



/* =========================================================
   PROFILE
========================================================= */

async function ensureProfile(
  profileData
) {

  if (!profileData?.id) {

    return null;

  }


  const {
    data: existing,
    error:
      selectError
  } =
    await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        profileData.id
      )
      .maybeSingle();


  if (selectError) {

    console.error(
      "profile select:",
      selectError
    );

    /*
     * select가 RLS 때문에 실패하더라도
     * insert를 바로 시도하지 않는다.
     */

    return null;

  }


  if (existing) {

    currentProfile =
      existing;

    return existing;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("profiles")
      .insert({

        id:
          profileData.id,

        name:
          profileData.name,

        school:
          profileData.school,

        grade:
          profileData.grade,

        class_number:
          profileData.class_number

      })
      .select()
      .single();


  if (error) {

    /*
     * DB trigger가 이미 만든 경우
     * duplicate를 치명적 오류로 취급하지 않는다.
     */

    console.error(
      "profile insert:",
      error
    );

    return null;

  }


  currentProfile =
    data;

  return data;

}



/* =========================================================
   LOAD PROFILE
========================================================= */

async function loadProfile() {

  if (!currentUser) {

    return;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        currentUser.id
      )
      .maybeSingle();


  if (error) {

    console.error(
      "load profile:",
      error
    );

    return;

  }


  if (!data) {

    /*
     * 혹시 회원가입 시 profile이 만들어지지
     * 않았다면 metadata로 다시 만든다.
     */

    const metadata =
      currentUser.user_metadata ||
      {};


    const fallback = {

      id:
        currentUser.id,

      name:
        metadata.name ||
        currentUser.email
          ?.split("@")[0] ||
        "사용자",

      school:
        metadata.school ||
        "",

      grade:
        Number(
          metadata.grade
        ) || 1,

      class_number:
        Number(
          metadata.class_number
        ) || 1

    };


    await ensureProfile(
      fallback
    );


    return loadProfile();

  }


  currentProfile =
    data;


  $("#top-user-name").textContent =
    data.name || "";


  $("#home-greeting").textContent =
    `${data.name || "사용자"}님, 안녕하세요 👋`;


  $("#profile-name").value =
    data.name || "";


  $("#profile-school").value =
    data.school || "";


  $("#profile-grade").value =
    data.grade || 1;


  $("#profile-class").value =
    data.class_number || 1;


  $("#ranking-class-info").textContent =
    `${data.school || ""} ${data.grade || ""}학년 ${data.class_number || ""}반`;

}



/* =========================================================
   SAVE PROFILE
========================================================= */

async function saveProfile() {

  if (!currentUser) {

    return;

  }


  const name =
    $("#profile-name")
      .value
      .trim();


  const school =
    $("#profile-school")
      .value
      .trim();


  const grade =
    Number(
      $("#profile-grade").value
    );


  const classNumber =
    Number(
      $("#profile-class").value
    );


  if (
    !name ||
    !school ||
    !grade ||
    !classNumber
  ) {

    toast(
      "모든 정보를 입력해주세요."
    );

    return;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("profiles")
      .update({

        name,

        school,

        grade,

        class_number:
          classNumber

      })
      .eq(
        "id",
        currentUser.id
      )
      .select()
      .single();


  if (error) {

    console.error(
      "save profile:",
      error
    );

    toast(
      error.message
    );

    return;

  }


  currentProfile =
    data;


  await loadProfile();

  toast(
    "정보가 저장되었습니다."
  );


  await loadRanking();

}



/* =========================================================
   DEFAULT SUBJECTS
========================================================= */

async function ensureDefaultSubjects() {

  if (!currentUser) {

    return;

  }


  const {
    count,
    error
  } =
    await supabase
      .from("subjects")
      .select(
        "*",
        {
          count:
            "exact",
          head:
            true
        }
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "subject count:",
      error
    );

    return;

  }


  if (
    Number(count) > 0
  ) {

    return;

  }


  const defaults = [

    {
      user_id:
        currentUser.id,

      name:
        "국어",

      color:
        "#ec4899"

    },

    {
      user_id:
        currentUser.id,

      name:
        "수학",

      color:
        "#6366f1"

    },

    {
      user_id:
        currentUser.id,

      name:
        "영어",

      color:
        "#22c55e"

    },

    {
      user_id:
        currentUser.id,

      name:
        "과학",

      color:
        "#06b6d4"

    }

  ];


  const {
    error:
      insertError
  } =
    await supabase
      .from("subjects")
      .insert(
        defaults
      );


  if (insertError) {

    console.error(
      "default subjects:",
      insertError
    );

  }

}



/* =========================================================
   START APP
========================================================= */

async function startApp() {

  if (
    !currentUser ||
    appStarting
  ) {

    return;

  }


  appStarting = true;


  try {

    showApp();


    await loadProfile();


    await ensureDefaultSubjects();


    await loadSubjects();


    await loadTodos();


    await restoreActiveSession();


    await refreshDashboard();


    showPage(
      "home"
    );

  } catch (error) {

    console.error(
      "startApp:",
      error
    );

    toast(
      "앱을 불러오는 중 문제가 발생했습니다."
    );

  } finally {

    appStarting = false;

  }

}



/* =========================================================
   SUBJECTS
========================================================= */

async function loadSubjects() {

  if (!currentUser) {

    return;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("subjects")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "created_at",
        {
          ascending:
            true
        }
      );


  if (error) {

    console.error(
      "load subjects:",
      error
    );

    return;

  }


  subjects =
    data || [];


  renderSubjects();

}



function renderSubjects() {

  const studyList =
    $("#study-subject-list");


  const settingsList =
    $("#settings-subject-list");


  const todoSelect =
    $("#todo-subject-input");


  const modalList =
    $("#study-modal-subject-list");


  if (!studyList) {

    return;

  }


  studyList.innerHTML =
    "";


  settingsList.innerHTML =
    "";


  modalList.innerHTML =
    "";


  todoSelect.innerHTML =
    `<option value="">과목 없음</option>`;


  if (
    subjects.length === 0
  ) {

    studyList.innerHTML =
      `
        <div class="empty-state">
          아직 과목이 없습니다.<br>
          과목을 추가해주세요.
        </div>
      `;

  }


  subjects.forEach(
    subject => {

      /*
       * STUDY CARD
       */

      const studyCard =
        document.createElement(
          "button"
        );


      studyCard.type =
        "button";


      studyCard.className =
        "subject-card" +
        (
          selectedSubjectId ===
          subject.id
            ? " selected"
            : ""
        );


      studyCard.innerHTML =
        `
          <span
            class="subject-dot"
            style="background:${escapeHtml(subject.color)}"
          ></span>

          <span class="subject-name">
            ${escapeHtml(subject.name)}
          </span>
        `;


      studyCard.addEventListener(
        "click",
        () => {

          selectedSubjectId =
            subject.id;

          renderSubjects();

          updateSelectedSubjectUI();

        }
      );


      studyList.appendChild(
        studyCard
      );


      /*
       * SETTINGS
       */

      const row =
        document.createElement(
          "div"
        );


      row.className =
        "settings-subject-row";


      row.innerHTML =
        `
          <span
            class="subject-dot"
            style="background:${escapeHtml(subject.color)}"
          ></span>

          <span class="settings-subject-name">
            ${escapeHtml(subject.name)}
          </span>

          <button
            class="subject-action edit-subject-button"
            type="button"
          >
            ✎
          </button>

          <button
            class="subject-action delete delete-subject-button"
            type="button"
          >
            ×
          </button>
        `;


      row
        .querySelector(
          ".edit-subject-button"
        )
        .addEventListener(
          "click",
          () => {
            openEditSubject(
              subject.id
            );
          }
        );


      row
        .querySelector(
          ".delete-subject-button"
        )
        .addEventListener(
          "click",
          () => {
            deleteSubject(
              subject.id
            );
          }
        );


      settingsList.appendChild(
        row
      );


      /*
       * TODO SELECT
       */

      const option =
        document.createElement(
          "option"
        );


      option.value =
        subject.id;


      option.textContent =
        subject.name;


      todoSelect.appendChild(
        option
      );


      /*
       * STUDY MODAL
       */

      const modalButton =
        document.createElement(
          "button"
        );


      modalButton.type =
        "button";


      modalButton.className =
        "study-modal-subject";


      modalButton.innerHTML =
        `
          <span
            class="subject-dot"
            style="background:${escapeHtml(subject.color)}"
          ></span>

          ${escapeHtml(subject.name)}
        `;


      modalButton.addEventListener(
        "click",
        () => {

          selectedSubjectId =
            subject.id;

          closeModal(
            "study-subject-modal"
          );

          renderSubjects();

          updateSelectedSubjectUI();

        }
      );


      modalList.appendChild(
        modalButton
      );

    }
  );


  updateSelectedSubjectUI();

}



function updateSelectedSubjectUI() {

  const subject =
    subjects.find(
      item =>
        item.id ===
        selectedSubjectId
    );


  if (subject) {

    $("#study-selected-subject")
      .textContent =
      subject.name;


    $("#home-current-subject")
      .textContent =
      subject.name;

  } else {

    $("#study-selected-subject")
      .textContent =
      "과목을 선택해주세요";


    $("#home-current-subject")
      .textContent =
      "공부를 시작해보세요";

  }

}



/* =========================================================
   SUBJECT ADD
========================================================= */

function openAddSubject() {

  editingSubjectId =
    null;


  selectedColor =
    "#6366f1";


  $("#subject-modal-title")
    .textContent =
    "과목 추가";


  $("#subject-name-input")
    .value =
    "";


  updateColorButtons();


  openModal(
    "subject-modal"
  );

}



/* =========================================================
   SUBJECT EDIT
========================================================= */

function openEditSubject(id) {

  const subject =
    subjects.find(
      item =>
        item.id === id
    );


  if (!subject) {

    return;

  }


  editingSubjectId =
    id;


  selectedColor =
    subject.color ||
    "#6366f1";


  $("#subject-modal-title")
    .textContent =
    "과목 수정";


  $("#subject-name-input")
    .value =
    subject.name;


  updateColorButtons();


  openModal(
    "subject-modal"
  );

}



/* =========================================================
   COLORS
========================================================= */

function updateColorButtons() {

  $$(".color-option")
    .forEach(
      button => {

        button.classList.toggle(
          "selected",
          button.dataset.color ===
          selectedColor
        );

      }
    );

}



/* =========================================================
   SAVE SUBJECT
========================================================= */

async function saveSubject() {

  if (!currentUser) {

    return;

  }


  const name =
    $("#subject-name-input")
      .value
      .trim();


  if (!name) {

    toast(
      "과목 이름을 입력해주세요."
    );

    return;

  }


  if (editingSubjectId) {

    const {
      error
    } =
      await supabase
        .from("subjects")
        .update({

          name,

          color:
            selectedColor

        })
        .eq(
          "id",
          editingSubjectId
        )
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "update subject:",
        error
      );

      toast(
        error.message
      );

      return;

    }


    toast(
      "과목이 수정되었습니다."
    );

  } else {

    const {
      error
    } =
      await supabase
        .from("subjects")
        .insert({

          user_id:
            currentUser.id,

          name,

          color:
            selectedColor

        });


    if (error) {

      console.error(
        "insert subject:",
        error
      );

      toast(
        error.message
      );

      return;

    }


    toast(
      "과목이 추가되었습니다."
    );

  }


  closeModal(
    "subject-modal"
  );


  await loadSubjects();

}



/* =========================================================
   DELETE SUBJECT
========================================================= */

async function deleteSubject(id) {

  const subject =
    subjects.find(
      item =>
        item.id === id
    );


  if (!subject) {

    return;

  }


  const ok =
    confirm(
      `"${subject.name}" 과목을 삭제할까요?\n\n기존 공부 기록은 유지됩니다.`
    );


  if (!ok) {

    return;

  }


  const {
    error
  } =
    await supabase
      .from("subjects")
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "delete subject:",
      error
    );

    toast(
      error.message
    );

    return;

  }


  if (
    selectedSubjectId === id
  ) {

    selectedSubjectId =
      null;

  }


  await loadSubjects();


  toast(
    "과목이 삭제되었습니다."
  );

}



/* =========================================================
   STUDY SESSION
========================================================= */

async function restoreActiveSession() {

  if (!currentUser) {

    return;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("study_sessions")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .is(
        "ended_at",
        null
      )
      .order(
        "started_at",
        {
          ascending:
            false
        }
      )
      .limit(1)
      .maybeSingle();


  if (error) {

    console.error(
      "restore session:",
      error
    );

    return;

  }


  if (!data) {

    currentSession =
      null;

    stopTimer();

    updateStudyUI();

    return;

  }


  currentSession =
    data;


  selectedSubjectId =
    data.subject_id;


  startTimer();


  updateStudyUI();

}



/* =========================================================
   START STUDY
========================================================= */

async function startStudy() {

  if (!currentUser) {

    return;

  }


  if (currentSession) {

    toast(
      "이미 공부 중입니다."
    );

    return;

  }


  if (!selectedSubjectId) {

    openStudySubjectModal();

    toast(
      "먼저 과목을 선택해주세요."
    );

    return;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("study_sessions")
      .insert({

        user_id:
          currentUser.id,

        subject_id:
          selectedSubjectId,

        started_at:
          new Date()
            .toISOString()

      })
      .select()
      .single();


  if (error) {

    console.error(
      "start study:",
      error
    );

    toast(
      error.message
    );

    return;

  }


  currentSession =
    data;


  startTimer();


  updateStudyUI();


  toast(
    "공부를 시작했습니다."
  );

}



/* =========================================================
   FINISH STUDY
========================================================= */

async function finishStudy() {

  if (
    !currentSession ||
    !currentUser
  ) {

    return;

  }


  const {
    error
  } =
    await supabase
      .from("study_sessions")
      .update({

        ended_at:
          new Date()
            .toISOString()

      })
      .eq(
        "id",
        currentSession.id
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "finish study:",
      error
    );

    toast(
      error.message
    );

    return;

  }


  stopTimer();


  currentSession =
    null;


  updateStudyUI();


  await refreshDashboard();


  toast(
    "공부 기록이 저장되었습니다."
  );

}



/* =========================================================
   TIMER
========================================================= */

function startTimer() {

  stopTimer();


  timerInterval =
    setInterval(
      updateTimerUI,
      1000
    );


  updateTimerUI();

}



function stopTimer() {

  if (timerInterval) {

    clearInterval(
      timerInterval
    );

    timerInterval =
      null;

  }

}



function getCurrentSessionSeconds() {

  if (!currentSession) {

    return 0;

  }


  const start =
    new Date(
      currentSession.started_at
    ).getTime();


  return Math.max(
    0,
    Math.floor(
      (
        Date.now() -
        start
      ) / 1000
    )
  );

}



function updateTimerUI() {

  const seconds =
    getCurrentSessionSeconds();


  if (currentSession) {

    setTimerText(
      $("#study-time"),
      seconds
    );

  } else {

    setTimerText(
      $("#study-time"),
      0
    );

  }


  updateStudyUI();


  /*
   * 홈의 오늘 시간도
   * 공부 중이면 매초 갱신한다.
   */

  updateHomeTodayTimeLocally();

}



function updateHomeTodayTimeLocally() {

  if (!currentUser) {

    return;

  }


  if (!currentSession) {

    return;

  }


  const start =
    new Date(
      currentSession.started_at
    );


  if (
    !isSameDayKST(start)
  ) {

    return;

  }


  const base =
    Number(
      $("#home-today-time")
        .dataset
        .baseSeconds ||
      0
    );


  const sessionSeconds =
    getCurrentSessionSeconds();


  setTimerText(
    $("#home-today-time"),
    base +
      sessionSeconds
  );

}



function updateStudyUI() {

  const active =
    Boolean(
      currentSession
    );


  $("#study-start-btn")
    .classList.toggle(
      "hidden",
      active
    );


  $("#study-finish-btn")
    .classList.toggle(
      "hidden",
      !active
    );


  $("#study-status")
    .textContent =
    active
      ? "● 공부 중"
      : "공부하지 않는 중";


  if (!active) {

    $("#study-time")
      .textContent =
      "00:00:00";

  }


  updateSelectedSubjectUI();

}



/* =========================================================
   SESSION HELPERS
========================================================= */

async function getOwnSessions() {

  if (!currentUser) {

    return [];

  }


  const {
    data,
    error
  } =
    await supabase
      .from("study_sessions")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "started_at",
        {
          ascending:
            true
        }
      );


  if (error) {

    console.error(
      "get sessions:",
      error
    );

    return [];

  }


  return data || [];

}



function sessionSeconds(
  session
) {

  if (!session) {

    return 0;

  }


  const start =
    new Date(
      session.started_at
    ).getTime();


  const end =
    session.ended_at
      ? new Date(
          session.ended_at
        ).getTime()
      : Date.now();


  return Math.max(
    0,
    Math.floor(
      (end - start) / 1000
    )
  );

}



/* =========================================================
   KOREA DATE
========================================================= */

function dateKST(date) {

  return new Date(date)
    .toLocaleDateString(
      "en-CA",
      {
        timeZone:
          "Asia/Seoul"
      }
    );

}



function isSameDayKST(
  date,
  target = new Date()
) {

  return (
    dateKST(date) ===
    dateKST(target)
  );

}



function getWeekStartKST() {

  const now =
    new Date();


  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Seoul",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit"
      }
    );


  const parts =
    formatter.formatToParts(
      now
    );


  const values = {};


  parts.forEach(
    part => {

      values[
        part.type
      ] =
        part.value;

    }
  );


  /*
   * 한국 시간의 월요일 00:00을
   * UTC timestamp로 계산
   */

  const utc =
    Date.UTC(
      Number(values.year),
      Number(values.month) - 1,
      Number(values.day)
    );


  const day =
    new Date(
      utc
    ).getUTCDay();


  const diff =
    day === 0
      ? 6
      : day - 1;


  return new Date(
    utc -
    diff * 86400000 +
    9 * 3600000
  );

}



function getMonthStartKST() {

  const now =
    new Date();


  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "Asia/Seoul",

        year:
          "numeric",

        month:
          "2-digit"
      }
    )
    .formatToParts(now);


  const values = {};


  parts.forEach(
    part => {

      values[
        part.type
      ] =
        part.value;

    }
  );


  return new Date(
    `${values.year}-${values.month}-01T00:00:00+09:00`
  );

}



/* =========================================================
   DASHBOARD
========================================================= */

async function refreshDashboard() {

  await loadTodayTime();

  await loadTodos();

  await loadHomeRanking();

}



async function loadTodayTime() {

  const sessions =
    await getOwnSessions();


  const total =
    sessions
      .filter(
        session =>
          isSameDayKST(
            session.started_at
          )
      )
      .reduce(
        (
          sum,
          session
        ) =>
          sum +
          sessionSeconds(
            session
          ),
        0
      );


  /*
   * timer가 돌아가는 중에는
   * base 값을 저장해두고
   * 매초 현재 session 시간을 추가한다.
   */

  const currentSeconds =
    currentSession
      ? sessionSeconds(
          currentSession
        )
      : 0;


  const base =
    Math.max(
      0,
      total -
      currentSeconds
    );


  $("#home-today-time")
    .dataset
    .baseSeconds =
    String(base);


  setTimerText(
    $("#home-today-time"),
    total
  );


  return total;

}



/* =========================================================
   TODO LOAD
========================================================= */

async function loadTodos() {

  if (!currentUser) {

    return;

  }


  const {
    data,
    error
  } =
    await supabase
      .from("todos")
      .select("*")
      .eq(
        "user_id",
        currentUser.id
      )
      .order(
        "completed",
        {
          ascending:
            true
        }
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );


  if (error) {

    console.error(
      "load todos:",
      error
    );

    return;

  }


  todos =
    data || [];


  renderTodos();

  renderHomeTodos();

}



/* =========================================================
   HOME TODO
========================================================= */

function renderHomeTodos() {

  const container =
    $("#home-todo-list");


  const today =
    dateKST(
      new Date()
    );


  const list =
    todos
      .filter(
        todo =>
          !todo.due_date ||
          todo.due_date <= today
      )
      .slice(
        0,
        4
      );


  if (!list.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          오늘의 할 일이 없습니다.
        </div>
      `;

    return;

  }


  container.innerHTML =
    "";


  list.forEach(
    todo => {

      const item =
        document.createElement(
          "div"
        );


      item.className =
        "home-todo-item" +
        (
          todo.completed
            ? " completed"
            : ""
        );


      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "todo-check" +
        (
          todo.completed
            ? " checked"
            : ""
        );


      button.textContent =
        todo.completed
          ? "✓"
          : "";


      button.addEventListener(
        "click",
        () => {

          toggleTodo(
            todo.id,
            !todo.completed
          );

        }
      );


      const span =
        document.createElement(
          "span"
        );


      span.textContent =
        todo.title;


      item.appendChild(
        button
      );


      item.appendChild(
        span
      );


      container.appendChild(
        item
      );

    }
  );

}



/* =========================================================
   TODO RENDER
========================================================= */

function renderTodos() {

  const container =
    $("#todo-list");


  let filtered =
    [...todos];


  if (
    currentTodoFilter ===
    "active"
  ) {

    filtered =
      todos.filter(
        todo =>
          !todo.completed
      );

  }


  if (
    currentTodoFilter ===
    "completed"
  ) {

    filtered =
      todos.filter(
        todo =>
          todo.completed
      );

  }


  if (!filtered.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          할 일이 없습니다.
        </div>
      `;

    return;

  }


  container.innerHTML =
    "";


  filtered.forEach(
    todo => {

      const subject =
        subjects.find(
          item =>
            item.id ===
            todo.subject_id
        );


      const item =
        document.createElement(
          "div"
        );


      item.className =
        "todo-item";


      const check =
        document.createElement(
          "button"
        );


      check.type =
        "button";


      check.className =
        "todo-check" +
        (
          todo.completed
            ? " checked"
            : ""
        );


      check.textContent =
        todo.completed
          ? "✓"
          : "";


      check.addEventListener(
        "click",
        () => {

          toggleTodo(
            todo.id,
            !todo.completed
          );

        }
      );


      const content =
        document.createElement(
          "div"
        );


      content.className =
        "todo-content" +
        (
          todo.completed
            ? " completed"
            : ""
        );


      const title =
        document.createElement(
          "strong"
        );


      title.textContent =
        todo.title;


      const meta =
        document.createElement(
          "div"
        );


      meta.className =
        "todo-meta";


      meta.textContent =
        (
          subject
            ? subject.name
            : "과목 없음"
        ) +
        (
          todo.due_date
            ? ` · ${todo.due_date}`
            : ""
        );


      content.appendChild(
        title
      );


      content.appendChild(
        meta
      );


      const actions =
        document.createElement(
          "div"
        );


      actions.className =
        "todo-actions";


      const edit =
        document.createElement(
          "button"
        );


      edit.type =
        "button";


      edit.className =
        "todo-action";


      edit.textContent =
        "✎";


      edit.addEventListener(
        "click",
        () => {

          openEditTodo(
            todo.id
          );

        }
      );


      const remove =
        document.createElement(
          "button"
        );


      remove.type =
        "button";


      remove.className =
        "todo-action";


      remove.textContent =
        "×";


      remove.addEventListener(
        "click",
        () => {

          deleteTodo(
            todo.id
          );

        }
      );


      actions.appendChild(
        edit
      );


      actions.appendChild(
        remove
      );


      item.appendChild(
        check
      );


      item.appendChild(
        content
      );


      item.appendChild(
        actions
      );


      container.appendChild(
        item
      );

    }
  );

}



/* =========================================================
   TODO ADD
========================================================= */

function openAddTodo() {

  editingTodoId =
    null;


  $("#todo-modal-title")
    .textContent =
    "할 일 추가";


  $("#todo-title-input")
    .value =
    "";


  $("#todo-subject-input")
    .value =
    "";


  $("#todo-date-input")
    .value =
    dateKST(
      new Date()
    );


  openModal(
    "todo-modal"
  );

}



/* =========================================================
   TODO EDIT
========================================================= */

function openEditTodo(id) {

  const todo =
    todos.find(
      item =>
        item.id === id
    );


  if (!todo) {

    return;

  }


  editingTodoId =
    id;


  $("#todo-modal-title")
    .textContent =
    "할 일 수정";


  $("#todo-title-input")
    .value =
    todo.title;


  $("#todo-subject-input")
    .value =
    todo.subject_id ||
    "";


  $("#todo-date-input")
    .value =
    todo.due_date ||
    "";


  openModal(
    "todo-modal"
  );

}



/* =========================================================
   TODO SAVE
========================================================= */

async function saveTodo() {

  if (!currentUser) {

    return;

  }


  const title =
    $("#todo-title-input")
      .value
      .trim();


  const subjectId =
    $("#todo-subject-input")
      .value ||
    null;


  const dueDate =
    $("#todo-date-input")
      .value ||
    null;


  if (!title) {

    toast(
      "할 일을 입력해주세요."
    );

    return;

  }


  if (editingTodoId) {

    const {
      error
    } =
      await supabase
        .from("todos")
        .update({

          title,

          subject_id:
            subjectId,

          due_date:
            dueDate

        })
        .eq(
          "id",
          editingTodoId
        )
        .eq(
          "user_id",
          currentUser.id
        );


    if (error) {

      console.error(
        "update todo:",
        error
      );

      toast(
        error.message
      );

      return;

    }


    toast(
      "할 일이 수정되었습니다."
    );

  } else {

    const {
      error
    } =
      await supabase
        .from("todos")
        .insert({

          user_id:
            currentUser.id,

          title,

          subject_id:
            subjectId,

          due_date:
            dueDate

        });


    if (error) {

      console.error(
        "insert todo:",
        error
      );

      toast(
        error.message
      );

      return;

    }


    toast(
      "할 일이 추가되었습니다."
    );

  }


  closeModal(
    "todo-modal"
  );


  await loadTodos();

}



/* =========================================================
   TODO TOGGLE
========================================================= */

async function toggleTodo(
  id,
  completed
) {

  if (!currentUser) {

    return;

  }


  const {
    error
  } =
    await supabase
      .from("todos")
      .update({

        completed

      })
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "toggle todo:",
      error
    );

    toast(
      error.message
    );

    return;

  }


  await loadTodos();

}



/* =========================================================
   TODO DELETE
========================================================= */

async function deleteTodo(id) {

  const ok =
    confirm(
      "이 할 일을 삭제할까요?"
    );


  if (!ok) {

    return;

  }


  const {
    error
  } =
    await supabase
      .from("todos")
      .delete()
      .eq(
        "id",
        id
      )
      .eq(
        "user_id",
        currentUser.id
      );


  if (error) {

    console.error(
      "delete todo:",
      error
    );

    toast(
      error.message
    );

    return;

  }


  await loadTodos();


  toast(
    "삭제되었습니다."
  );

}



/* =========================================================
   RANKING
========================================================= */

async function loadHomeRanking() {

  if (!currentUser) {

    return;

  }


  const {
    data,
    error
  } =
    await supabase.rpc(
      "get_class_ranking",
      {
        target_period:
          "today"
      }
    );


  if (error) {

    console.error(
      "home ranking:",
      error
    );


    $("#home-ranking")
      .innerHTML =
      `
        <div class="empty-state">
          랭킹을 불러오지 못했습니다.
        </div>
      `;

    return;

  }


  const list =
    (
      data || []
    ).slice(
      0,
      5
    );


  if (!list.length) {

    $("#home-ranking")
      .innerHTML =
      `
        <div class="empty-state">
          같은 반 친구가 아직 없습니다.
        </div>
      `;

    return;

  }


  $("#home-ranking")
    .innerHTML =
    "";


  list.forEach(
    (item, index) => {

      $("#home-ranking")
        .appendChild(
          createRankingRow(
            item,
            index
          )
        );

    }
  );

}



async function loadRanking() {

  if (!currentUser) {

    return;

  }


  const container =
    $("#ranking-list");


  container.innerHTML =
    `
      <div class="empty-state">
        랭킹을 불러오는 중...
      </div>
    `;


  const {
    data,
    error
  } =
    await supabase.rpc(
      "get_class_ranking",
      {
        target_period:
          currentRankingPeriod
      }
    );


  if (error) {

    console.error(
      "ranking:",
      error
    );


    container.innerHTML =
      `
        <div class="empty-state">
          랭킹을 불러오지 못했습니다.<br>
          ${escapeHtml(error.message)}
        </div>
      `;

    return;

  }


  const list =
    data || [];


  if (!list.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          같은 반 친구가 없습니다.
        </div>
      `;

    return;

  }


  container.innerHTML =
    "";


  list.forEach(
    (item, index) => {

      container.appendChild(
        createRankingRow(
          item,
          index
        )
      );

    }
  );

}



function createRankingRow(
  item,
  index
) {

  const row =
    document.createElement(
      "div"
    );


  row.className =
    "rank-row";


  if (
    currentUser &&
    item.user_id ===
    currentUser.id
  ) {

    row.classList.add(
      "me-row"
    );

  }


  const number =
    document.createElement(
      "div"
    );


  number.className =
    "rank-number";


  number.textContent =
    index === 0
      ? "🥇"
      : index === 1
        ? "🥈"
        : index === 2
          ? "🥉"
          : String(
              index + 1
            );


  const name =
    document.createElement(
      "div"
    );


  name.className =
    "rank-name";


  name.textContent =
    item.name || "사용자";


  if (
    currentUser &&
    item.user_id ===
    currentUser.id
  ) {

    name.textContent +=
      " (나)";

  }


  const time =
    document.createElement(
      "div"
    );


  time.className =
    "rank-time";


  time.textContent =
    formatSeconds(
      Number(
        item.total_seconds ||
        0
      )
    );


  row.appendChild(
    number
  );


  row.appendChild(
    name
  );


  row.appendChild(
    time
  );


  return row;

}



/* =========================================================
   STATISTICS
========================================================= */

async function loadStatistics() {

  const sessions =
    await getOwnSessions();


  const todaySeconds =
    sessions
      .filter(
        session =>
          isSameDayKST(
            session.started_at
          )
      )
      .reduce(
        (
          sum,
          session
        ) =>
          sum +
          sessionSeconds(
            session
          ),
        0
      );


  const weekStart =
    getWeekStartKST();


  const weekSeconds =
    sessions
      .filter(
        session =>
          new Date(
            session.started_at
          ) >=
          weekStart
      )
      .reduce(
        (
          sum,
          session
        ) =>
          sum +
          sessionSeconds(
            session
          ),
        0
      );


  const monthStart =
    getMonthStartKST();


  const monthSeconds =
    sessions
      .filter(
        session =>
          new Date(
            session.started_at
          ) >=
          monthStart
      )
      .reduce(
        (
          sum,
          session
        ) =>
          sum +
          sessionSeconds(
            session
          ),
        0
      );


  const totalSeconds =
    sessions.reduce(
      (
        sum,
        session
      ) =>
        sum +
        sessionSeconds(
          session
        ),
      0
    );


  $("#stat-today")
    .textContent =
    formatShortDuration(
      todaySeconds
    );


  $("#stat-week")
    .textContent =
    formatShortDuration(
      weekSeconds
    );


  $("#stat-month")
    .textContent =
    formatShortDuration(
      monthSeconds
    );


  $("#stat-total")
    .textContent =
    formatShortDuration(
      totalSeconds
    );


  renderWeeklyChart(
    sessions
  );


  renderSubjectStats(
    sessions
  );

}



/* =========================================================
   WEEKLY CHART
========================================================= */

function renderWeeklyChart(
  sessions
) {

  const start =
    getWeekStartKST();


  const values =
    [];


  for (
    let i = 0;
    i < 7;
    i++
  ) {

    const date =
      new Date(
        start.getTime() +
        i *
        86400000
      );


    const key =
      date.toLocaleDateString(
        "en-CA",
        {
          timeZone:
            "Asia/Seoul"
        }
      );


    const total =
      sessions
        .filter(
          session =>
            dateKST(
              session.started_at
            ) === key
        )
        .reduce(
          (
            sum,
            session
          ) =>
            sum +
            sessionSeconds(
              session
            ),
          0
        );


    values.push(
      total
    );

  }


  const max =
    Math.max(
      ...values,
      1
    );


  const labels =
    [
      "월",
      "화",
      "수",
      "목",
      "금",
      "토",
      "일"
    ];


  const chart =
    $("#weekly-chart");


  chart.innerHTML =
    "";


  values.forEach(
    (
      value,
      index
    ) => {

      const column =
        document.createElement(
          "div"
        );


      column.className =
        "bar-column";


      const valueText =
        document.createElement(
          "span"
        );


      valueText.className =
        "bar-value";


      valueText.textContent =
        formatShortDuration(
          value
        );


      const bar =
        document.createElement(
          "div"
        );


      bar.className =
        "bar";


      const height =
        Math.max(
          3,
          (
            value /
            max
          ) * 160
        );


      bar.style.height =
        `${height}px`;


      const day =
        document.createElement(
          "span"
        );


      day.className =
        "bar-day";


      day.textContent =
        labels[index];


      column.appendChild(
        valueText
      );


      column.appendChild(
        bar
      );


      column.appendChild(
        day
      );


      chart.appendChild(
        column
      );

    }
  );

}



/* =========================================================
   SUBJECT STATISTICS
========================================================= */

function renderSubjectStats(
  sessions
) {

  const totals = {};


  sessions.forEach(
    session => {

      const id =
        session.subject_id ||
        "none";


      totals[id] =
        (
          totals[id] ||
          0
        ) +
        sessionSeconds(
          session
        );

    }
  );


  const entries =
    Object.entries(
      totals
    )
    .sort(
      (
        a,
        b
      ) =>
        b[1] -
        a[1]
    );


  const container =
    $("#subject-stats");


  if (!entries.length) {

    container.innerHTML =
      `
        <div class="empty-state">
          아직 공부 기록이 없습니다.
        </div>
      `;

    return;

  }


  const max =
    entries[0][1];


  container.innerHTML =
    "";


  entries.forEach(
    (
      [id, seconds]
    ) => {

      const subject =
        subjects.find(
          item =>
            item.id === id
        );


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "subject-stat-row";


      const top =
        document.createElement(
          "div"
        );


      top.className =
        "subject-stat-top";


      const name =
        document.createElement(
          "span"
        );


      name.textContent =
        subject
          ? subject.name
          : "과목 없음";


      const time =
        document.createElement(
          "strong"
        );


      time.textContent =
        formatShortDuration(
          seconds
        );


      top.appendChild(
        name
      );


      top.appendChild(
        time
      );


      const progress =
        document.createElement(
          "div"
        );


      progress.className =
        "progress";


      const fill =
        document.createElement(
          "div"
        );


      fill.className =
        "progress-fill";


      fill.style.width =
        `${
          max > 0
            ? (
                seconds /
                max
              ) * 100
            : 0
        }%`;


      fill.style.background =
        subject
          ? subject.color
          : "#94a3b8";


      progress.appendChild(
        fill
      );


      row.appendChild(
        top
      );


      row.appendChild(
        progress
      );


      container.appendChild(
        row
      );

    }
  );

}



/* =========================================================
   NAVIGATION
========================================================= */

function showPage(
  pageName
) {

  $$(".page")
    .forEach(
      page => {

        page.classList.remove(
          "active"
        );

      }
    );


  const page =
    $(`#page-${pageName}`);


  if (!page) {

    return;

  }


  page.classList.add(
    "active"
  );


  $$(".nav-btn")
    .forEach(
      button => {

        button.classList.toggle(
          "active",
          button.dataset.page ===
          pageName
        );

      }
    );


  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });


  if (
    pageName ===
    "home"
  ) {

    refreshDashboard();

  }


  if (
    pageName ===
    "study"
  ) {

    loadSubjects();

  }


  if (
    pageName ===
    "ranking"
  ) {

    loadRanking();

  }


  if (
    pageName ===
    "statistics"
  ) {

    loadStatistics();

  }


  if (
    pageName ===
    "todos"
  ) {

    loadTodos();

  }


  if (
    pageName ===
    "settings"
  ) {

    loadProfile();

    loadSubjects();

  }

}



/* =========================================================
   MODALS
========================================================= */

function openModal(id) {

  $(`#${id}`)
    ?.classList.remove(
      "hidden"
    );

}


function closeModal(id) {

  $(`#${id}`)
    ?.classList.add(
      "hidden"
    );

}


function openStudySubjectModal() {

  openModal(
    "study-subject-modal"
  );

}



/* =========================================================
   EVENTS
========================================================= */

function bindEvents() {

  /*
   * AUTH
   */

  $("#login-btn")
    .addEventListener(
      "click",
      login
    );


  $("#signup-btn")
    .addEventListener(
      "click",
      signup
    );


  $("#logout-btn")
    .addEventListener(
      "click",
      logout
    );


  $("#show-signup-btn")
    .addEventListener(
      "click",
      showSignupForm
    );


  $("#show-login-btn")
    .addEventListener(
      "click",
      showLoginForm
    );


  /*
   * ENTER KEY LOGIN
   */

  $("#login-password")
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          login();

        }

      }
    );


  /*
   * ENTER KEY SIGNUP
   */

  $("#signup-password")
    .addEventListener(
      "keydown",
      event => {

        if (
          event.key ===
          "Enter"
        ) {

          signup();

        }

      }
    );


  /*
   * HOME START
   */

  $("#home-start-btn")
    .addEventListener(
      "click",
      () => {

        if (
          !selectedSubjectId
        ) {

          openStudySubjectModal();

          return;

        }


        startStudy();

      }
    );


  /*
   * STUDY
   */

  $("#study-start-btn")
    .addEventListener(
      "click",
      () => {

        if (
          !selectedSubjectId
        ) {

          openStudySubjectModal();

          return;

        }


        startStudy();

      }
    );


  $("#study-finish-btn")
    .addEventListener(
      "click",
      finishStudy
    );


  /*
   * SUBJECT
   */

  $("#add-subject-btn")
    .addEventListener(
      "click",
      openAddSubject
    );


  $("#add-subject-from-study")
    .addEventListener(
      "click",
      openAddSubject
    );


  $("#save-subject-btn")
    .addEventListener(
      "click",
      saveSubject
    );


  /*
   * TODO
   */

  $("#add-todo-btn")
    .addEventListener(
      "click",
      openAddTodo
    );


  $("#save-todo-btn")
    .addEventListener(
      "click",
      saveTodo
    );


  /*
   * PROFILE
   */

  $("#save-profile-btn")
    .addEventListener(
      "click",
      saveProfile
    );


  /*
   * NAV
   */

  $$(".nav-btn")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            showPage(
              button.dataset.page
            );

          }
        );

      }
    );


  /*
   * OTHER PAGE BUTTONS
   */

  $$("[data-page]")
    .forEach(
      button => {

        if (
          button.classList.contains(
            "nav-btn"
          )
        ) {

          return;

        }


        button.addEventListener(
          "click",
          () => {

            showPage(
              button.dataset.page
            );

          }
        );

      }
    );


  /*
   * RANKING PERIOD
   */

  $$(".ranking-period")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            $$(".ranking-period")
              .forEach(
                item =>
                  item.classList.remove(
                    "active"
                  )
              );


            button.classList.add(
              "active"
            );


            currentRankingPeriod =
              button.dataset.period;


            loadRanking();

          }
        );

      }
    );


  /*
   * TODO FILTER
   */

  $$(".todo-filter-btn")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            $$(".todo-filter-btn")
              .forEach(
                item =>
                  item.classList.remove(
                    "active"
                  )
              );


            button.classList.add(
              "active"
            );


            currentTodoFilter =
              button.dataset.filter;


            renderTodos();

          }
        );

      }
    );


  /*
   * MODAL CLOSE
   */

  $$(".modal-close")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            closeModal(
              button.dataset.close
            );

          }
        );

      }
    );


  /*
   * COLOR
   */

  $$(".color-option")
    .forEach(
      button => {

        button.addEventListener(
          "click",
          () => {

            selectedColor =
              button.dataset.color;


            updateColorButtons();

          }
        );

      }
    );


  /*
   * ESC
   */

  document.addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Escape"
      ) {

        $$(".modal")
          .forEach(
            modal =>
              modal.classList.add(
                "hidden"
              )
          );

      }

    }
  );


  /*
   * CLICK OUTSIDE MODAL
   */

  $$(".modal")
    .forEach(
      modal => {

        modal.addEventListener(
          "click",
          event => {

            if (
              event.target ===
              modal
            ) {

              modal.classList.add(
                "hidden"
              );

            }

          }
        );

      }
    );


  /*
   * SUPABASE AUTH LISTENER
   */

  supabase.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      /*
       * 중요한 점:
       * 여기서 await startApp()을 직접 하지 않는다.
       * Auth callback 안에서 또 다른 Supabase 요청을
       * await하면 일부 환경에서 교착 문제가 생길 수 있다.
       */

      if (
        event ===
          "SIGNED_IN" &&
        session?.user
      ) {

        currentUser =
          session.user;


        setTimeout(
          () => {

            startApp();

          },
          0
        );

      }


      if (
        event ===
        "SIGNED_OUT"
      ) {

        stopTimer();


        currentUser =
          null;


        currentProfile =
          null;


        currentSession =
          null;


        subjects =
          [];


        todos =
          [];


        showAuth();

      }

    }
  );

}



/* =========================================================
   VISIBILITY
========================================================= */

document.addEventListener(
  "visibilitychange",
  async () => {

    if (
      !document.hidden &&
      currentUser
    ) {

      await restoreActiveSession();

      await loadTodayTime();

    }

  }
);



/* =========================================================
   FORMAT
========================================================= */

function setTimerText(
  element,
  seconds
) {

  if (!element) {

    return;

  }


  element.textContent =
    formatSeconds(
      seconds
    );

}



function formatSeconds(
  seconds
) {

  seconds =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );


  const hours =
    Math.floor(
      seconds / 3600
    );


  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) / 60
    );


  const secs =
    seconds % 60;


  return [

    hours,

    minutes,

    secs

  ]
    .map(
      value =>
        String(value)
          .padStart(
            2,
            "0"
          )
    )
    .join(":");

}



function formatShortDuration(
  seconds
) {

  seconds =
    Math.max(
      0,
      Math.floor(
        Number(seconds) || 0
      )
    );


  const hours =
    Math.floor(
      seconds / 3600
    );


  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) / 60
    );


  if (hours > 0) {

    return `${hours}시간 ${minutes}분`;

  }


  return `${minutes}분`;

}



/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "";

  }


  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}



/* =========================================================
   TOAST
========================================================= */

let toastTimeout =
  null;


function toast(
  message
) {

  const element =
    $("#toast");


  const messageElement =
    $("#toast-message");


  if (!element) {

    return;

  }


  messageElement.textContent =
    message;


  element.classList.add(
    "show"
  );


  clearTimeout(
    toastTimeout
  );


  toastTimeout =
    setTimeout(
      () => {

        element.classList.remove(
          "show"
        );

      },
      3000
    );

}
