const $ = (id) => document.getElementById(id);

const pages = [
    "homePage",
    "createPage",
    "browsePage",
    "takePage",
    "resultPage"
];

let quizzes = loadQuizzes();
let activeQuiz = null;
let currentQuestion = 0;
let selectedAnswer = null;
let userAnswers = [];
let lastQuizId = null;
let toastTimer;

// ---------- STORAGE ----------

function loadQuizzes() {
    try {
        const data = JSON.parse(
            localStorage.getItem("quizoraQuizzes") || "[]"
        );
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
}

function saveQuizzes() {
    try {
        localStorage.setItem(
            "quizoraQuizzes",
            JSON.stringify(quizzes)
        );
        return true;
    } catch {
        showToast("Could not save. Browser storage may be full.");
        return false;
    }
}

function makeId() {
    return Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

// ---------- NAVIGATION ----------

function showPage(pageId) {
    pages.forEach(id => $(id).classList.add("hidden"));
    $(pageId).classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        $("toast").classList.remove("show");
    }, 2800);
}

function updateQuizCount() {
    $("quizCount").textContent = quizzes.length;
}

// ---------- CREATE QUIZ ----------

function addQuestion() {
    const list = $("questionList");
    const number = list.children.length + 1;
    const card = document.createElement("div");

    card.className = "question-card";

    card.innerHTML = `
        <div class="question-card-head">
            <h3>Question ${number}</h3>
            <button type="button" class="remove-question">
                Remove
            </button>
        </div>

        <label>Question text</label>
        <input type="text" class="question-input"
               placeholder="Enter your question"
               maxlength="300" required>

        <span class="option-label">Option A</span>
        <input type="text" class="option-input"
               placeholder="First answer" maxlength="200" required>

        <span class="option-label">Option B</span>
        <input type="text" class="option-input"
               placeholder="Second answer" maxlength="200" required>

        <span class="option-label">Option C</span>
        <input type="text" class="option-input"
               placeholder="Third answer" maxlength="200" required>

        <span class="option-label">Option D</span>
        <input type="text" class="option-input"
               placeholder="Fourth answer" maxlength="200" required>

        <label class="correct-label">
            Correct answer
        </label>
        <select class="correct-input" required>
            <option value="0">Option A</option>
            <option value="1">Option B</option>
            <option value="2">Option C</option>
            <option value="3">Option D</option>
        </select>
    `;

    card.querySelector(".remove-question")
        .addEventListener("click", () => {
            card.remove();
            renumberQuestions();
        });

    list.appendChild(card);
    renumberQuestions();
}

function renumberQuestions() {
    document.querySelectorAll(".question-card")
        .forEach((card, index) => {
            card.querySelector("h3").textContent =
                `Question ${index + 1}`;
        });
}

function openCreatePage() {
    $("quizForm").reset();
    $("questionList").replaceChildren();
    addQuestion();
    showPage("createPage");
}

$("addQuestion").addEventListener("click", () => {
    if ($("questionList").children.length >= 50) {
        showToast("Maximum 50 questions per quiz.");
        return;
    }
    addQuestion();
});

$("quizForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("quizTitle").value.trim();
    const description = $("quizDescription").value.trim();
    const cards = [
        ...document.querySelectorAll(".question-card")
    ];

    if (!title) {
        showToast("Please enter a quiz title.");
        return;
    }

    if (cards.length === 0) {
        showToast("Add at least one question.");
        return;
    }

    const questions = [];

    for (const card of cards) {
        const question = card.querySelector(".question-input")
            .value.trim();

        const options = [
            ...card.querySelectorAll(".option-input")
        ].map(input => input.value.trim());

        const correct = Number(
            card.querySelector(".correct-input").value
        );

        if (!question || options.some(option => !option)) {
            showToast("Please complete every question and option.");
            return;
        }

        questions.push({ question, options, correct });
    }

    const newQuiz = {
        id: makeId(),
        title,
        description,
        questions,
        createdAt: new Date().toISOString()
    };

    quizzes.unshift(newQuiz);

    if (!saveQuizzes()) {
        quizzes.shift();
        return;
    }

    updateQuizCount();
    renderQuizList();
    showToast("Quiz created successfully!");
    showPage("browsePage");
});

// ---------- DISPLAY AVAILABLE QUIZZES ----------

function renderQuizList() {
    const list = $("quizList");
    list.replaceChildren();

    if (quizzes.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty-state";

        const heading = document.createElement("h3");
        heading.textContent = "No quizzes yet!";

        const message = document.createElement("p");
        message.textContent =
            "Create your first quiz and it will appear here.";

        const button = document.createElement("button");
        button.className = "primary-btn";
        button.textContent = "+ Create your first quiz";
        button.addEventListener("click", openCreatePage);

        empty.append(heading, message, button);
        list.appendChild(empty);
        return;
    }

    quizzes.forEach((quiz, index) => {
        const card = document.createElement("article");
        card.className = "quiz-item";

        const icon = document.createElement("div");
        icon.className = "quiz-emoji";
        icon.textContent = ["🧠", "🚀", "📚", "💡"][index % 4];

        const title = document.createElement("h3");
        title.textContent = quiz.title;

        const description = document.createElement("p");
        description.textContent =
            quiz.description || "Test your knowledge with this quiz.";

        const meta = document.createElement("div");
        meta.className = "quiz-meta";
        meta.textContent =
            `${quiz.questions.length} question(s) · Multiple choice`;

        const button = document.createElement("button");
        button.className = "primary-btn";
        button.textContent = "Start Quiz →";
        button.addEventListener("click", () => startQuiz(quiz.id));

        card.append(icon, title, description, meta, button);
        list.appendChild(card);
    });
}

// ---------- TAKE QUIZ ----------

function startQuiz(id) {
    const quiz = quizzes.find(item => item.id === id);

    if (!quiz || !quiz.questions.length) {
        showToast("This quiz is not available.");
        renderQuizList();
        showPage("browsePage");
        return;
    }

    activeQuiz = quiz;
    lastQuizId = id;
    currentQuestion = 0;
    selectedAnswer = null;
    userAnswers = Array(quiz.questions.length).fill(null);

    $("takeQuizTitle").textContent = quiz.title;
    showPage("takePage");
    renderQuestion();
}

function renderQuestion() {
    const question = activeQuiz.questions[currentQuestion];

    selectedAnswer = userAnswers[currentQuestion];

    $("questionCounter").textContent =
        `Question ${currentQuestion + 1} of ${activeQuiz.questions.length}`;

    $("takeProgress").style.width =
        `${((currentQuestion + 1) / activeQuiz.questions.length) * 100}%`;

    $("questionText").textContent = question.question;

    $("answerHint").textContent = "Choose one answer";
    $("nextQuestion").disabled = selectedAnswer === null;

    $("nextQuestion").textContent =
        currentQuestion === activeQuiz.questions.length - 1
            ? "Finish Quiz ✓"
            : "Next Question →";

    const optionsBox = $("answerOptions");
    optionsBox.replaceChildren();

    const letters = ["A", "B", "C", "D"];

    question.options.forEach((option, index) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-option";

        if (selectedAnswer === index) {
            button.classList.add("selected");
        }

        const letter = document.createElement("span");
        letter.className = "option-letter";
        letter.textContent = letters[index];

        const text = document.createElement("span");
        text.textContent = option;

        button.append(letter, text);

        button.addEventListener("click", () => {
            selectedAnswer = index;
            userAnswers[currentQuestion] = index;

            optionsBox.querySelectorAll("button")
                .forEach(item => item.classList.remove("selected"));

            button.classList.add("selected");
            $("nextQuestion").disabled = false;
            $("answerHint").textContent = "Answer selected ✓";
        });

        optionsBox.appendChild(button);
    });
}

$("nextQuestion").addEventListener("click", () => {
    if (selectedAnswer === null) {
        showToast("Please select an answer first.");
        return;
    }

    userAnswers[currentQuestion] = selectedAnswer;

    if (currentQuestion < activeQuiz.questions.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        showResults();
    }
});

// ---------- RESULTS AND SCORE ----------

function showResults() {
    const questions = activeQuiz.questions;
    let score = 0;

    questions.forEach((question, index) => {
        if (userAnswers[index] === question.correct) {
            score++;
        }
    });

    const percentage = Math.round(score / questions.length * 100);

    $("scoreValue").textContent = `${score}/${questions.length}`;
    $("scorePercent").textContent = `${percentage}%`;

    $("resultHeading").textContent =
        percentage === 100 ? "Perfect score!" :
        percentage >= 60 ? "Well done!" : "Keep practising!";

    $("resultMessage").textContent =
        `You answered ${score} out of ${questions.length} questions correctly.`;

    $("resultIcon").textContent =
        percentage >= 80 ? "🏆" :
        percentage >= 50 ? "🎉" : "💪";

    const review = $("answerReview");
    review.replaceChildren();

    questions.forEach((question, index) => {
        const correct = userAnswers[index] === question.correct;
        const item = document.createElement("article");

        item.className = `review-item ${correct ? "correct" : "incorrect"}`;

        const heading = document.createElement("h4");
        heading.textContent =
            `${correct ? "✓ Correct" : "✗ Incorrect"} — ${index + 1}. ${question.question}`;

        const yourAnswer = document.createElement("p");
        yourAnswer.textContent = userAnswers[index] === null
            ? "Your answer: Not answered"
            : `Your answer: ${question.options[userAnswers[index]]}`;

        const correctAnswer = document.createElement("p");
        correctAnswer.textContent =
            `Correct answer: ${question.options[question.correct]}`;

        item.append(heading, yourAnswer, correctAnswer);
        review.appendChild(item);
    });

    showPage("resultPage");
}

$("retryQuiz").addEventListener("click", () => {
    if (lastQuizId) startQuiz(lastQuizId);
});

$("resultHome").addEventListener("click", () => {
    renderQuizList();
    showPage("homePage");
});

$("exitQuiz").addEventListener("click", () => {
    renderQuizList();
    showPage("browsePage");
});

// ---------- BUTTONS AND INITIAL SETUP ----------

$("homeBtn").addEventListener("click", () => showPage("homePage"));
$("homeLogo").addEventListener("click", event => {
    event.preventDefault();
    showPage("homePage");
});

$("browseBtn").addEventListener("click", () => {
    renderQuizList();
    showPage("browsePage");
});

$("createBtn").addEventListener("click", openCreatePage);
$("heroCreate").addEventListener("click", openCreatePage);
$("homeCreateLink").addEventListener("click", openCreatePage);

$("heroExplore").addEventListener("click", () => {
    renderQuizList();
    showPage("browsePage");
});

$("homeBrowseLink").addEventListener("click", () => {
    renderQuizList();
    showPage("browsePage");
});

$("cancelCreate").addEventListener("click", () => {
    showPage("homePage");
});

$("year").textContent = new Date().getFullYear();

updateQuizCount();
renderQuizList();
showPage("homePage");