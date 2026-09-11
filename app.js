// 1. Firebase Imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
	getAuth,
	createUserWithEmailAndPassword,
	signInWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	sendPasswordResetEmail,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
	getFirestore,
	doc,
	setDoc,
	getDoc,
	collection,
	addDoc,
	getDocs,
	query,
	where,
	updateDoc,
	deleteDoc,
	onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Firebase Config & Init
const firebaseConfig = {
	apiKey: "AIzaSyBrfJlyREmQozjfq188EPi2zXt5lkPrw8o",
	authDomain: "care-plus-59478.firebaseapp.com",
	databaseURL: "https://care-plus-59478-default-rtdb.firebaseio.com",
	projectId: "care-plus-59478",
	storageBucket: "care-plus-59478.firebasestorage.app",
	messagingSenderId: "261175243462",
	appId: "1:261175243462:web:d0193963171f16c41f1dc7",
	measurementId: "G-Y2LDFNCZBT",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 3. رسائل المستخدم المنسقة (بديل alert التقليدي)
const notificationContainer = document.getElementById("notification-container");

function showAlert(message, type = "auto") {
	if (!notificationContainer) {
		console.log(message);
		return;
	}

	const text = String(message ?? "");
	const detectedType =
		type === "auto"
			? /نجاح|تم |بنجاح|success/i.test(text)
				? "success"
				: /خطأ|فشل|غير صحيحة|محظور|مفقود|يرجى|يجب|error|invalid/i.test(text)
					? "error"
					: "info"
			: type;

	const config = {
		success: { icon: "fa-circle-check", title: "تم بنجاح" },
		error: { icon: "fa-circle-exclamation", title: "تنبيه" },
		warning: { icon: "fa-triangle-exclamation", title: "تنبيه" },
		info: { icon: "fa-circle-info", title: "معلومة" },
	}[detectedType] || { icon: "fa-circle-info", title: "معلومة" };

	const toast = document.createElement("div");
	toast.className = `notification notification-${detectedType}`;
	toast.innerHTML = `
		<div class="notification-icon"><i class="fa-solid ${config.icon}"></i></div>
		<div class="notification-body">
			<strong>${config.title}</strong>
			<p>${escapeNotificationHtml(text)}</p>
		</div>
		<button class="notification-close" type="button" aria-label="إغلاق">
			<i class="fa-solid fa-xmark"></i>
		</button>
		<div class="notification-progress"></div>
	`;

	notificationContainer.appendChild(toast);
	requestAnimationFrame(() => toast.classList.add("show"));

	const close = () => {
		toast.classList.remove("show");
		toast.classList.add("hide");
		setTimeout(() => toast.remove(), 280);
	};

	toast.querySelector(".notification-close")?.addEventListener("click", close);
	const timer = setTimeout(close, 4500);
	toast.addEventListener("mouseenter", () => clearTimeout(timer), {
		once: true,
	});
}

function escapeNotificationHtml(value) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

// ==========================================================================
// جلسة واحدة فقط لكل حساب
// ==========================================================================
const ACTIVE_SESSION_KEY = "platform_active_session_id";
let activeSessionId = localStorage.getItem(ACTIVE_SESSION_KEY);
let unsubscribeUserSession = null;
let sessionSyncInProgress = false;

function createSessionId() {
	if (window.crypto?.randomUUID) return window.crypto.randomUUID();
	return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

async function claimSingleUserSession(user) {
	if (!user) return false;
	activeSessionId = createSessionId();
	localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
	await updateDoc(doc(db, "users", user.uid), {
		activeSessionId,
		lastLoginAt: new Date().toISOString(),
	});
	return true;
}

function stopUserSessionWatcher() {
	if (unsubscribeUserSession) {
		unsubscribeUserSession();
		unsubscribeUserSession = null;
	}
}

function watchSingleUserSession(user) {
	stopUserSessionWatcher();
	if (!user) return;

	const userRef = doc(db, "users", user.uid);
	unsubscribeUserSession = onSnapshot(userRef, async (snap) => {
		const data = snap.data();
		if (!data || !activeSessionId) return;

		if (data.activeSessionId && data.activeSessionId !== activeSessionId) {
			stopUserSessionWatcher();
			localStorage.removeItem(ACTIVE_SESSION_KEY);
			activeSessionId = null;
			showAlert(
				"تم تسجيل الدخول بهذا الحساب من جهاز أو جلسة أخرى. سيتم تسجيل خروجك من هذه الجلسة.",
				"warning",
			);
			await signOut(auth);
		}
	});
}

// ==========================================================================
// تأكيدات منسقة بدل confirm() التقليدي
// ==========================================================================
function confirmAction(message, options = {}) {
	return new Promise((resolve) => {
		const title = options.title || "تأكيد العملية";
		const confirmText = options.confirmText || "تأكيد";
		const cancelText = options.cancelText || "إلغاء";

		const wrapper = document.createElement("div");
		wrapper.className = "confirm-dialog";
		wrapper.innerHTML = `
			<div class="confirm-dialog-overlay"></div>
			<div class="confirm-dialog-card" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
				<div class="confirm-dialog-icon"><i class="fa-solid fa-circle-question"></i></div>
				<div class="confirm-dialog-body">
					<h3 id="confirm-dialog-title">${escapeNotificationHtml(title)}</h3>
					<p>${escapeNotificationHtml(message)}</p>
				</div>
				<div class="confirm-dialog-actions">
					<button type="button" class="btn btn-secondary confirm-cancel">${escapeNotificationHtml(cancelText)}</button>
					<button type="button" class="btn btn-primary confirm-ok">${escapeNotificationHtml(confirmText)}</button>
				</div>
			</div>
		`;
		document.body.appendChild(wrapper);

		const finish = (result) => {
			wrapper.classList.add("closing");
			setTimeout(() => wrapper.remove(), 180);
			resolve(result);
		};

		wrapper
			.querySelector(".confirm-ok")
			?.addEventListener("click", () => finish(true));
		wrapper
			.querySelector(".confirm-cancel")
			?.addEventListener("click", () => finish(false));
		wrapper
			.querySelector(".confirm-dialog-overlay")
			?.addEventListener("click", () => finish(false));
	});
}

// 3. DOM Elements
const authBtn = document.getElementById("auth-btn");
const authModal = document.getElementById("auth-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const modalOverlay = document.getElementById("modal-overlay");

const authForm = document.getElementById("auth-form");
const nameInput = document.getElementById("auth-name");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const togglePasswordBtn = document.getElementById("toggle-password-btn");
const nameGroup = document.getElementById("name-group");
const roleGroup = document.getElementById("role-group");
const submitBtn = document.getElementById("auth-submit-btn");

const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleText = document.getElementById("toggle-text");

// إظهار/إخفاء كلمة المرور — يعمل في تسجيل الدخول وإنشاء الحساب
togglePasswordBtn?.addEventListener("click", () => {
	if (!passwordInput) return;
	const isPassword = passwordInput.type === "password";
	passwordInput.type = isPassword ? "text" : "password";
	togglePasswordBtn.innerHTML = isPassword
		? '<i class="fa-solid fa-eye-slash"></i>'
		: '<i class="fa-solid fa-eye"></i>';
	togglePasswordBtn.setAttribute(
		"aria-label",
		isPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور",
	);
	togglePasswordBtn.setAttribute("aria-pressed", String(isPassword));
});

// Profile Modal & Logout
const profileBtn = document.getElementById("profile-btn");
const profileModal = document.getElementById("profile-modal");
const closeProfileBtn = document.getElementById("close-profile-btn");
const profileModalOverlay = document.getElementById("profile-modal-overlay");
const logoutBtn = document.getElementById("logout-btn");

const profileName = document.getElementById("profile-name");
const profileEmail = document.getElementById("profile-email");
const profileRole = document.getElementById("profile-role");

// Views / Dashboards
const dashboardSection = document.getElementById("dashboard");
const studentView = document.getElementById("student-view");
const teacherView = document.getElementById("teacher-view");
const parentView = document.getElementById("parent-view");
const adminView = document.getElementById("admin-view");
const heroLanding = document.getElementById("hero-landing");
const howItWorksSection = document.getElementById("how-it-works");

// Course Modal Elements
const addCourseBtn = document.getElementById("add-course-btn");
const addCourseModal = document.getElementById("add-course-modal");
const closeCourseModalBtn = document.getElementById("close-course-modal-btn");
const addCourseOverlay = document.getElementById("add-course-overlay");
const addCourseForm = document.getElementById("add-course-form");

const courseTitleInput = document.getElementById("course-title");
const coursePriceInput = document.getElementById("course-price");
const courseDescInput = document.getElementById("course-description");
const teacherCoursesList = document.getElementById("teacher-courses-list");

let isSignUp = false;
let currentUserData = null;

const roleTranslations = {
	student: "طالب",
	teacher: "معلم",
	parent: "ولي أمر",
	admin: "أدمن",
};

// 4. Helper Functions & Auth Modes
function setAuthMode(signUp) {
	isSignUp = signUp;
	if (isSignUp) {
		modalTitle.textContent = "إنشاء حساب جديد";
		modalSubtitle.textContent = "اختر نوع الحساب وأدخل البيانات المطلوبة";
		submitBtn.textContent = "إنشاء حساب";
		toggleText.textContent = "لديك حساب بالفعل؟";
		toggleAuthBtn.textContent = "تسجيل الدخول";

		nameGroup?.classList.remove("hidden");
		roleGroup?.classList.remove("hidden");
		if (nameInput) nameInput.required = true;
	} else {
		modalTitle.textContent = "تسجيل الدخول";
		modalSubtitle.textContent = "أدخل البريد الإلكتروني وكلمة المرور للمتابعة";
		submitBtn.textContent = "تسجيل الدخول";
		toggleText.textContent = "ليس لديك حساب؟";
		toggleAuthBtn.textContent = "إنشاء حساب جديد";

		nameGroup?.classList.add("hidden");
		roleGroup?.classList.add("hidden");
		if (nameInput) nameInput.required = false;
	}
}

const openAuthModal = () => {
	setAuthMode(false);
	authModal?.classList.remove("hidden");
};

const closeAuthModal = () => {
	authModal?.classList.add("hidden");
	authForm?.reset();
	setAuthMode(false);
};

const openProfileModal = () => {
	if (currentUserData) {
		profileName.textContent = currentUserData.fullName || "غير محدد";
		profileEmail.textContent = currentUserData.email || "غير محدد";
		profileRole.textContent =
			roleTranslations[currentUserData.role] || currentUserData.role;
	}
	profileModal?.classList.remove("hidden");
};

const closeProfileModal = () => profileModal?.classList.add("hidden");

function renderRoleDashboard(role) {
	dashboardSection?.classList.add("hidden");
	studentView?.classList.add("hidden");
	teacherView?.classList.add("hidden");
	parentView?.classList.add("hidden");
	adminView?.classList.add("hidden");

	if (!role) {
		heroLanding?.classList.remove("hidden");
		howItWorksSection?.classList.remove("hidden");
		return;
	}

	heroLanding?.classList.add("hidden");
	howItWorksSection?.classList.add("hidden");
	dashboardSection?.classList.remove("hidden");

	if (role === "student") {
		studentView?.classList.remove("hidden");
		loadStudentMarketplaceCourses(); // تحميل كورسات المنصة للطالب
		loadEnrolledCoursesForStudent(); // تحميل الكورسات المسجل بها الطالب فعلياً
	} else if (role === "teacher") {
		teacherView?.classList.remove("hidden");
		if (auth.currentUser) {
			loadTeacherCourses(auth.currentUser.uid);
		}
	} else if (role === "parent") {
		parentView?.classList.remove("hidden");
	} else if (role === "admin") {
		adminView?.classList.remove("hidden");
		loadAdminDashboardData();
	}
}

// دالة حماية النصوص لمنع المشاكل في HTML
function escapeHtml(str) {
	if (!str) return "";
	return str.replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

// 5. Auth Event Listeners
closeModalBtn?.addEventListener("click", closeAuthModal);
modalOverlay?.addEventListener("click", closeAuthModal);

closeProfileBtn?.addEventListener("click", closeProfileModal);
profileModalOverlay?.addEventListener("click", closeProfileModal);

authBtn?.addEventListener("click", openAuthModal);
profileBtn?.addEventListener("click", openProfileModal);

toggleAuthBtn?.addEventListener("click", (e) => {
	e.preventDefault();
	setAuthMode(!isSignUp);
});

logoutBtn?.addEventListener("click", async () => {
	try {
		const user = auth.currentUser;
		stopUserSessionWatcher();
		if (user && activeSessionId) {
			try {
				await updateDoc(doc(db, "users", user.uid), { activeSessionId: null });
			} catch (e) {
				console.warn("تعذر تنظيف الجلسة السابقة:", e);
			}
		}
		localStorage.removeItem(ACTIVE_SESSION_KEY);
		activeSessionId = null;
		await signOut(auth);
		closeProfileModal();
		showAlert("تم تسجيل الخروج بنجاح.", "success");
	} catch (error) {
		showAlert("تعذر تسجيل الخروج. حاول مرة أخرى.", "error");
	}
});

// Submit Form Handler
authForm?.addEventListener("submit", async (e) => {
	e.preventDefault();
	const email = emailInput.value.trim();
	const password = passwordInput.value;

	try {
		if (isSignUp) {
			const fullName = nameInput.value.trim();
			const selectedRole =
				document.querySelector('input[name="userRole"]:checked')?.value ||
				"student";

			// لا يسمح التسجيل العام بإنشاء حساب معلم؛ المعلم يُعيّن بواسطة الأدمن فقط.
			if (!["student", "parent"].includes(selectedRole)) {
				showAlert("إنشاء حسابات المعلمين متاح للأدمن فقط.", "warning");
				return;
			}

			const userCredential = await createUserWithEmailAndPassword(
				auth,
				email,
				password,
			);
			const user = userCredential.user;

			try {
				await setDoc(doc(db, "users", user.uid), {
					uid: user.uid,
					fullName: fullName,
					email: email,
					role: selectedRole,
					isBanned: false,
					createdAt: new Date().toISOString(),
				});
			} catch (firestoreError) {
				console.error("Firestore Error:", firestoreError);
				showAlert(
					"تم إنشاء الحساب بنجاح، لكن يرجى التأكد من ضبط قواعد Firestore Rules لتخزين البيانات.",
				);
				closeAuthModal();
				return;
			}

			showAlert(`تم إنشاء حساب (${roleTranslations[selectedRole]}) بنجاح!`);
		} else {
			sessionSyncInProgress = true;
			try {
				const userCredential = await signInWithEmailAndPassword(
					auth,
					email,
					password,
				);
				await claimSingleUserSession(userCredential.user);
			} finally {
				sessionSyncInProgress = false;
			}
		}
		closeAuthModal();
	} catch (error) {
		console.error("Auth Error:", error);
		if (error.code === "auth/email-already-in-use") {
			showAlert(
				"هذا البريد الإلكتروني مسجل بالفعل! اضغط على زر (تسجيل الدخول) للمتابعة.",
			);
		} else if (error.code === "auth/invalid-credential") {
			showAlert("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
		} else {
			showAlert("تعذر تنفيذ العملية. من فضلك حاول مرة أخرى.", "error");
		}
	}
});

// 6. Dynamic Auth State Listener
onAuthStateChanged(auth, async (user) => {
	if (user) {
		authBtn?.classList.add("hidden");
		profileBtn?.classList.remove("hidden");

		try {
			const userDocRef = doc(db, "users", user.uid);
			const userDocSnap = await getDoc(userDocRef);

			if (userDocSnap.exists()) {
				currentUserData = userDocSnap.data();

				if (currentUserData.isBanned) {
					showAlert(
						"عذراً، هذا الحساب محظور حالياً. يرجى التواصل مع الإدارة.",
						"warning",
					);
					await signOut(auth);
					return;
				}

				// في حالة فتح الصفحة بعد Refresh نُنشئ جلسة للجهاز الحالي.
				if (!sessionSyncInProgress && !activeSessionId) {
					try {
						await claimSingleUserSession(user);
					} catch (sessionError) {
						console.error("Session Error:", sessionError);
						showAlert(
							"تعذر تأمين جلسة الحساب. يرجى المحاولة مرة أخرى.",
							"error",
						);
						await signOut(auth);
						return;
					}
				}

				watchSingleUserSession(user);
				renderRoleDashboard(currentUserData.role);
			} else {
				currentUserData = {
					uid: user.uid,
					email: user.email,
					fullName: user.displayName || "مستخدم",
					role: "student",
				};
				renderRoleDashboard("student");
			}
		} catch (e) {
			console.error("Error fetching user data:", e);
			showAlert("تعذر تحميل بيانات الحساب. حاول تحديث الصفحة.", "error");
		}
	} else {
		stopUserSessionWatcher();
		activeSessionId = null;
		localStorage.removeItem(ACTIVE_SESSION_KEY);
		currentUserData = null;
		authBtn?.classList.remove("hidden");
		profileBtn?.classList.add("hidden");
		renderRoleDashboard(null);

		if (document.body?.classList.contains("login-page")) {
			setTimeout(openAuthModal, 150);
		}
	}
});

// 7. Admin Dashboard Functionalities (Real-time updates)
// ==========================================
// 7. Admin Dashboard Functionalities (Real-time updates)
// ==========================================
function loadAdminDashboardData() {
	const usersListEl = document.getElementById("admin-users-list");
	const coursesListEl = document.getElementById("admin-courses-list");
	const enrollmentsListEl = document.getElementById("admin-enrollments-list");

	// أ. الاستماع لطلبات الاشتراكات المعلقة (Real-time)
	onSnapshot(
		collection(db, "enrollments"),
		(enrollmentsSnapshot) => {
			let enrollmentsHTML = "";

			enrollmentsSnapshot.forEach((docSnap) => {
				const req = docSnap.data();
				// نعرض الطلبات المعلقة فقط للمراجعة
				if (req.status !== "pending") return;

				enrollmentsHTML += `
                    <tr>
                        <td>${req.studentName || "طالب"} (${req.studentEmail})</td>
                        <td>${req.courseTitle || "كورس"}</td>
                        <td><span class="badge-pending" style="color: #A66A1E; font-weight: bold;">قيد المراجعة 🟡</span></td>
                        <td>
                            <button class="btn-sm btn-success" onclick="window.updateEnrollmentStatus('${docSnap.id}', 'approved')">موافقة 🟢</button>
                            <button class="btn-sm btn-danger" onclick="window.updateEnrollmentStatus('${docSnap.id}', 'rejected')">رفض 🔴</button>
                        </td>
                    </tr>
                `;
			});

			if (enrollmentsListEl) {
				enrollmentsListEl.innerHTML =
					enrollmentsHTML ||
					`<tr><td colspan="4" style="text-align:center; padding: 1.5rem;">لا توجد طلبات اشتراك معلقة حالياً.</td></tr>`;
			}
		},
		(error) => {
			console.error("خطأ في جلب طلبات الاشتراكات:", error);
			if (enrollmentsListEl) {
				enrollmentsListEl.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">خطأ في الجلب: ${error.message}</td></tr>`;
			}
		},
	);

	// ب. الاستماع للمستخدمين (Real-time)
	onSnapshot(
		collection(db, "users"),
		(usersSnapshot) => {
			let usersHTML = "";
			let studentCount = 0;
			let teacherCount = 0;

			usersSnapshot.forEach((userDoc) => {
				const u = userDoc.data();
				if (u.role === "student") studentCount++;
				if (u.role === "teacher") teacherCount++;

				const banBtnText = u.isBanned ? "فك الحظر" : "حظر";
				const banBtnClass = u.isBanned ? "btn-success" : "btn-warning";

				usersHTML += `
          <tr>
            <td>${u.fullName || "بدون اسم"}</td>
            <td>${u.email}</td>
            <td><span class="badge">${roleTranslations[u.role] || u.role}</span></td>
            <td>
              <select onchange="window.changeUserRole('${u.uid}', this.value)">
                <option value="">تغيير الدور...</option>
                <option value="student">طالب</option>
                <option value="teacher">معلم</option>
                <option value="parent">ولي أمر</option>
                <option value="admin">أدمن</option>
              </select>
            </td>
            <td>
              <button class="btn-sm ${banBtnClass}" onclick="window.toggleUserBlock('${u.uid}', ${!!u.isBanned})">${banBtnText}</button>
              <button class="btn-sm btn-secondary" onclick="window.sendResetPasswordLink('${u.email}')">كلمة السر</button>
              <button class="btn-sm btn-danger" onclick="window.deleteUserRecord('${u.uid}')">حذف</button>
            </td>
          </tr>
        `;
			});

			if (usersListEl) {
				usersListEl.innerHTML =
					usersHTML ||
					`<tr><td colspan="5" style="text-align:center;">لا يوجد مستخدمون حالياً.</td></tr>`;
			}

			const statUsers = document.getElementById("stat-users-count");
			const statStudents = document.getElementById("stat-students-count");
			const statTeachers = document.getElementById("stat-teachers-count");

			if (statUsers) statUsers.textContent = usersSnapshot.size;
			if (statStudents) statStudents.textContent = studentCount;
			if (statTeachers) statTeachers.textContent = teacherCount;
		},
		(error) => {
			console.error("خطأ في جلب بيانات المستخدمين:", error);
			if (usersListEl) {
				usersListEl.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">خطأ في الجلب: ${error.message}</td></tr>`;
			}
		},
	);

	// ج. الاستماع للكورسات (Real-time)
	onSnapshot(
		collection(db, "courses"),
		(coursesSnapshot) => {
			let coursesHTML = "";

			coursesSnapshot.forEach((courseDoc) => {
				const c = courseDoc.data();
				const statusBadge =
					c.status === "approved"
						? `<span class="badge-approved" style="color: #3F7857; font-weight: bold;">مقبول 🟢</span>`
						: c.status === "rejected"
							? `<span class="badge-rejected" style="color: #B54A3A; font-weight: bold;">مرفوض 🔴</span>`
							: `<span class="badge-pending" style="color: #A66A1E; font-weight: bold;">قيد المراجعة 🟡</span>`;

				const featureText = c.isFeatured
					? "إلغاء التمييز ⭐"
					: "ميّز الكورس 🌟";

				coursesHTML += `
          <tr>
            <td>${c.title}</td>
            <td>${c.teacherName || "غير معروف"}</td>
            <td>${c.price} ج.م</td>
            <td>${statusBadge}</td>
            <td>
              <button class="btn-sm btn-success" onclick="window.updateCourseStatus('${courseDoc.id}', 'approved')">موافقة</button>
              <button class="btn-sm btn-warning" onclick="window.updateCourseStatus('${courseDoc.id}', 'rejected')">رفض</button>
              <button class="btn-sm btn-info" onclick="window.toggleCourseFeature('${courseDoc.id}', ${!!c.isFeatured})">${featureText}</button>
              <button class="btn-sm btn-danger" onclick="window.deleteCourseRecord('${courseDoc.id}')">حذف</button>
            </td>
          </tr>
        `;
			});

			if (coursesListEl) {
				coursesListEl.innerHTML =
					coursesHTML ||
					`<tr><td colspan="5" style="text-align:center;">لا توجد كورسات مضافة بعد.</td></tr>`;
			}

			const statCourses = document.getElementById("stat-courses-count");
			if (statCourses) statCourses.textContent = coursesSnapshot.size;
		},
		(error) => {
			console.error("خطأ في جلب الكورسات عند الأدمن:", error);
			if (coursesListEl) {
				coursesListEl.innerHTML = `<tr><td colspan="5" style="color:red; text-align:center;">خطأ صلاحيات/جلب البيانات: ${error.message}</td></tr>`;
			}
		},
	);
}

// ==========================================
// Window Global Functions (النطاق العام)
// ==========================================

// ملاحظة: window.updateEnrollmentStatus معرّفة بشكل كامل لاحقاً في هذا الملف.

// ملاحظة: window.openStudentCourseModal و window.requestCourseEnrollment
// معرّفتان بشكل كامل وأحدث لاحقاً في هذا الملف.

window.changeUserRole = async (uid, newRole) => {
	if (!newRole) return;
	if (!["student", "teacher", "parent", "admin"].includes(newRole)) {
		showAlert("الدور المطلوب غير صالح.", "error");
		return;
	}
	if (
		await confirmAction(
			`هل أنت متأكد من تغيير دور هذا المستخدم إلى (${roleTranslations[newRole]})؟`,
			{ title: "تغيير دور المستخدم", confirmText: "تغيير الدور" },
		)
	) {
		try {
			await updateDoc(doc(db, "users", uid), { role: newRole });
			showAlert(
				`تم تغيير دور المستخدم إلى (${roleTranslations[newRole]}) بنجاح.`,
				"success",
			);
		} catch (error) {
			console.error("Role update error:", error);
			showAlert("لا يمكن تغيير دور المستخدم إلا من خلال حساب الأدمن.", "error");
		}
	}
};

window.deleteUserRecord = async (uid) => {
	if (
		await confirmAction(
			"هل أنت متأكد من حذف بيانات هذا المستخدم من قاعدة البيانات؟",
			{ title: "حذف بيانات المستخدم", confirmText: "حذف نهائياً" },
		)
	) {
		await deleteDoc(doc(db, "users", uid));
		showAlert("تم حذف المستخدم بنجاح!");
	}
};

window.toggleUserBlock = async (uid, isCurrentlyBanned) => {
	const action = isCurrentlyBanned ? "فك حظر" : "حظر";
	if (
		await confirmAction(`هل أنت متأكد من ${action} هذا المستخدم؟`, {
			title: `${action} المستخدم`,
			confirmText: action,
		})
	) {
		await updateDoc(doc(db, "users", uid), { isBanned: !isCurrentlyBanned });
		showAlert(`تم ${action} المستخدم بنجاح!`);
	}
};

window.sendResetPasswordLink = async (email) => {
	if (
		await confirmAction(`إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`, {
			title: "إعادة تعيين كلمة المرور",
			confirmText: "إرسال الرابط",
		})
	) {
		try {
			await sendPasswordResetEmail(auth, email);
			showAlert("تم إرسال رابط إعادة التعيين بنجاح إلى بريد المستخدم.");
		} catch (err) {
			showAlert(
				"تعذر إرسال رابط إعادة تعيين كلمة المرور. من فضلك حاول مرة أخرى.",
				"error",
			);
		}
	}
};

window.updateCourseStatus = async (courseId, newStatus) => {
	try {
		await updateDoc(doc(db, "courses", courseId), { status: newStatus });
		showAlert(
			`تم تحديث حالة الكورس بنجاح إلى (${newStatus === "approved" ? "مقبول" : "مرفوض"})`,
		);
	} catch (err) {
		showAlert("تعذر تحديث حالة الكورس. من فضلك حاول مرة أخرى.", "error");
	}
};

window.toggleCourseFeature = async (courseId, isCurrentlyFeatured) => {
	try {
		await updateDoc(doc(db, "courses", courseId), {
			isFeatured: !isCurrentlyFeatured,
		});
		showAlert(
			isCurrentlyFeatured
				? "تم إزالة التمييز عن الكورس"
				: "تم تمييز الكورس بنجاح!",
		);
	} catch (err) {
		showAlert("حدث خطأ: " + err.message);
	}
};

window.deleteCourseRecord = async (courseId) => {
	if (
		await confirmAction("هل أنت متأكد من حذف هذا الكورس نهائياً؟", {
			title: "حذف الكورس",
			confirmText: "حذف نهائياً",
		})
	) {
		try {
			await deleteDoc(doc(db, "courses", courseId));
			showAlert("تم حذف الكورس بنجاح!");
		} catch (err) {
			showAlert("تعذر حذف الكورس. من فضلك حاول مرة أخرى.", "error");
		}
	}
};

window.sendGlobalAnnouncement = async () => {
	const input = document.getElementById("global-announcement-input");
	const text = input?.value.trim();
	if (!text) return showAlert("يرجى كتابة نص الإعلان أولاً.");

	await addDoc(collection(db, "announcements"), {
		message: text,
		createdAt: new Date().toISOString(),
		active: true,
	});

	showAlert("تم نشر الإعلان بنجاح لجميع المستخدمين!");
	if (input) input.value = "";
};

document
	.getElementById("refresh-admin-btn")
	?.addEventListener("click", loadAdminDashboardData);
// 8. تصدير CSV
function downloadCSV(csvContent, fileName) {
	const blob = new Blob(["\ufeff" + csvContent], {
		type: "text/csv;charset=utf-8;",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.setAttribute("href", url);
	a.setAttribute("download", fileName);
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

async function exportUsersToCSV() {
	try {
		const usersSnapshot = await getDocs(collection(db, "users"));
		if (usersSnapshot.empty) return showAlert("لا يوجد مستخدمون لتصديرهم.");

		let csv =
			"المعرف (UID),الاسم الكامل,البريد الإلكتروني,نوع الحساب,حالة الحظر\n";

		usersSnapshot.forEach((docSnap) => {
			const u = docSnap.data();
			const name = `"${(u.fullName || "غير محدد").replace(/"/g, '""')}"`;
			const email = `"${(u.email || "").replace(/"/g, '""')}"`;
			const role = `"${roleTranslations[u.role] || u.role}"`;
			const banned = u.isBanned ? "محظور" : "نشط";

			csv += `${u.uid},${name},${email},${role},${banned}\n`;
		});

		const fileName = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;
		downloadCSV(csv, fileName);
	} catch (err) {
		console.error("خطأ أثناء تصدير المستخدمين:", err);
		showAlert("حدث خطأ أثناء تصدير ملف المستخدمين.");
	}
}

async function exportCoursesToCSV() {
	try {
		const coursesSnapshot = await getDocs(collection(db, "courses"));
		if (coursesSnapshot.empty) return showAlert("لا توجد كورسات لتصديرها.");

		let csv = "المعرف,اسم الكورس,اسم المعلم,السعر (ج.م),الحالة,مُميّز\n";

		coursesSnapshot.forEach((docSnap) => {
			const c = docSnap.data();
			const title = `"${(c.title || "").replace(/"/g, '""')}"`;
			const teacher = `"${(c.teacherName || "غير معروف").replace(/"/g, '""')}"`;
			const price = c.price || 0;
			const status =
				c.status === "approved"
					? "مقبول"
					: c.status === "rejected"
						? "مرفوض"
						: "قيد المراجعة";
			const featured = c.isFeatured ? "نعم" : "لا";

			csv += `${docSnap.id},${title},${teacher},${price},${status},${featured}\n`;
		});

		const fileName = `courses_export_${new Date().toISOString().slice(0, 10)}.csv`;
		downloadCSV(csv, fileName);
	} catch (err) {
		console.error("خطأ أثناء تصدير الكورسات:", err);
		showAlert("حدث خطأ أثناء تصدير ملف الكورسات.");
	}
}

document
	.getElementById("export-users-btn")
	?.addEventListener("click", exportUsersToCSV);
document
	.getElementById("export-courses-btn")
	?.addEventListener("click", exportCoursesToCSV);

// 9. إدارة كورس المعلم (Teacher Course Management)
const openCourseModal = () => addCourseModal?.classList.remove("hidden");
const closeCourseModal = () => {
	addCourseModal?.classList.add("hidden");
	addCourseForm?.reset();
};

addCourseBtn?.addEventListener("click", openCourseModal);
closeCourseModalBtn?.addEventListener("click", closeCourseModal);
addCourseOverlay?.addEventListener("click", closeCourseModal);

// عرض كارت الكورس الجذاب بدون صور
function renderCourseCard(course, courseId) {
	let statusBadge = "";
	let manageContentButton = "";

	if (course.status === "approved") {
		statusBadge = `<span class="badge-status status-approved">مقبول ✅</span>`;
		manageContentButton = `
            <button class="btn-manage-content" onclick="window.openLessonsModal('${courseId}', '${escapeHtml(course.title)}')">
              🎬 إدارة محتوى الكورس والإصدارات
            </button>
        `;
	} else if (course.status === "pending") {
		statusBadge = `<span class="badge-status status-pending">قيد المراجعة ⏳</span>`;
		manageContentButton = `<p style="font-size: 0.85rem; color: #6B6456; text-align: center; margin: 0;">في انتظار موافقة الأدمن لإضافة المحتوى</p>`;
	} else {
		statusBadge = `<span class="badge-status status-rejected">مرفوض ❌</span>`;
	}

	const lessonsCount = course.lessonsCount || course.totalLessons || "متعددة";
	const duration = course.duration || "حسب التقدم";
	const subject = course.subject || "كورس تعليمي";

	return `
    <div class="course-card-modern">
      <div class="course-header-banner">
        <div class="banner-top-bar">
          <span class="course-category-badge">📚 ${subject}</span>
          ${statusBadge}
        </div>
        <div class="banner-price-tag">
          ${course.price ? `${course.price} <small>ج.م</small>` : "مجاني"}
        </div>
      </div>

      <div class="course-content">
        <h3 class="course-title">${course.title}</h3>
        <p class="course-description">${course.description || "لا يوجد وصف محدد لهذا الكورس حالياً."}</p>
        
        <div class="course-stats-grid">
          <div class="stat-item">
            <span class="stat-icon">🎬</span>
            <div class="stat-info">
              <span class="stat-label">عدد الحصص</span>
              <span class="stat-value">${lessonsCount} حصة</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">⏱️</span>
            <div class="stat-info">
              <span class="stat-label">المدة الكلية</span>
              <span class="stat-value">${duration}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">👨‍🏫</span>
            <div class="stat-info">
              <span class="stat-label">المعلم</span>
              <span class="stat-value">${course.teacherName || course.instructorName || "غير محدد"}</span>
            </div>
          </div>
          <div class="stat-item">
            <span class="stat-icon">♾️</span>
            <div class="stat-info">
              <span class="stat-label">الوصول</span>
              <span class="stat-value">مدى الحياة</span>
            </div>
          </div>
        </div>
      </div>

      <div class="course-card-actions">
        ${manageContentButton}
      </div>
    </div>
  `;
}

function loadTeacherCourses(teacherUid) {
	if (!teacherCoursesList) return;

	teacherCoursesList.innerHTML = `<p style="text-align:center;">جاري تحميل الكورسات...</p>`;

	const q = query(
		collection(db, "courses"),
		where("teacherId", "==", teacherUid),
	);

	onSnapshot(
		q,
		(querySnapshot) => {
			if (querySnapshot.empty) {
				teacherCoursesList.innerHTML = `<p style="text-align:center; color:#6B6456;">لم تقم بإنشاء أي كورسات حتى الآن.</p>`;
				return;
			}

			let cardsHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.25rem; margin-top: 1rem;">`;

			querySnapshot.forEach((docSnap) => {
				const c = docSnap.data();
				cardsHTML += renderCourseCard(c, docSnap.id);
			});

			cardsHTML += `</div>`;
			teacherCoursesList.innerHTML = cardsHTML;
		},
		(err) => {
			console.error("خطأ أثناء جلب كورسات المعلم:", err);
			teacherCoursesList.innerHTML = `<p style="color:red; text-align:center;">حدث خطأ أثناء تحميل الكورسات.</p>`;
		},
	);
}

addCourseForm?.addEventListener("submit", async (e) => {
	e.preventDefault();

	const user = auth.currentUser;
	if (!user) {
		showAlert("يرجى تسجيل الدخول أولاً كـ معلم لإضافة كورس.");
		return;
	}

	const title = courseTitleInput.value.trim();
	const price = Number(coursePriceInput.value);
	const description = courseDescInput.value.trim();

	if (!title || isNaN(price)) {
		showAlert("يرجى ملء جميع الحقول المطلوبة بشكل صحيح.");
		return;
	}

	try {
		await addDoc(collection(db, "courses"), {
			title: title,
			price: price,
			description: description,
			teacherId: user.uid,
			teacherName: currentUserData?.fullName || user.displayName || "معلم",
			status: "pending",
			isFeatured: false,
			createdAt: new Date().toISOString(),
		});

		showAlert("تم تقديم الكورس بنجاح وهو الآن قيد المراجعة من الأدمن!");
		closeCourseModal();
	} catch (err) {
		console.error("خطأ أثناء حفظ الكورس:", err);
		if (err.code === "permission-denied") {
			showAlert("تم الرفض بسبب صلاحيات Firestore.");
		} else {
			showAlert(
				"تعذر حفظ الكورس. تأكد من البيانات والصلاحيات ثم حاول مرة أخرى.",
				"error",
			);
		}
	}
});

// 10. قسم الطالب: استعراض الكورسات المقبولة وطلب الاشتراك
function loadStudentMarketplaceCourses() {
	const studentCoursesList = document.getElementById("student-courses-list");
	if (!studentCoursesList) return;

	studentCoursesList.innerHTML = `<p style="text-align:center;">جاري تحميل الكورسات المتاحة...</p>`;

	// الاستماع للكورسات المقبولة فقط لكي يراها الطلاب
	const q = query(collection(db, "courses"), where("status", "==", "approved"));

	onSnapshot(
		q,
		async (snapshot) => {
			if (snapshot.empty) {
				studentCoursesList.innerHTML = `<p style="text-align:center; color:#6B6456;">لا توجد كورسات متاحة للاشتراك حالياً.</p>`;
				return;
			}

			// جلب طلبات الاشتراك الخاصة بالطالب الحالي لمعرفة حالتها (إن وجدت)
			let userEnrollments = {};
			if (auth.currentUser) {
				const enrollQuery = query(
					collection(db, "enrollments"),
					where("studentId", "==", auth.currentUser.uid),
				);
				const enrollSnap = await getDocs(enrollQuery);
				enrollSnap.forEach((d) => {
					const data = d.data();
					userEnrollments[data.courseId] = data.status; // 'pending' or 'approved'
				});
			}

			let cardsHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.25rem; margin-top: 1rem;">`;

			snapshot.forEach((docSnap) => {
				const c = docSnap.data();
				const courseId = docSnap.id;
				const enrollStatus = userEnrollments[courseId];

				let actionButton = "";
				if (enrollStatus === "approved") {
					actionButton = `<button class="btn-success" style="width:100%; padding:0.6rem; border-radius:8px; border:none; font-weight:bold; color:white; background:#3F7857;" onclick="window.openStudentLessonsModal('${courseId}', '${escapeHtml(c.title)}')">📚 دخول إلى محتوى الحصص</button>`;
				} else if (enrollStatus === "pending") {
					actionButton = `<button class="btn-warning" style="width:100%; padding:0.6rem; border-radius:8px; border:none; font-weight:bold; color:#4A3410; background:#F6E9D7;" disabled>⏳ طلب الاشتراك قيد المراجعة</button>`;
				} else {
					actionButton = `<button class="btn-primary" style="width:100%; padding:0.6rem; border-radius:8px; border:none; font-weight:bold; color:white; background:#B4863A; cursor:pointer;" onclick="window.requestCourseEnrollment('${courseId}', '${escapeHtml(c.title)}')">🛒 طلب الاشتراك في الكورس</button>`;
				}

				cardsHTML += `
                <div class="course-card-modern">
                  <div class="course-header-banner">
                    <div class="banner-top-bar">
                      <span class="course-category-badge">📚 ${c.subject || "تعليمي"}</span>
                      ${c.isFeatured ? '<span class="badge-featured" style="background:#D9A73B; color:#4A3410; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:bold;">مميز ⭐</span>' : ""}
                    </div>
                    <div class="banner-price-tag">
                      ${c.price ? `${c.price} <small>ج.م</small>` : "مجاني"}
                    </div>
                  </div>

                  <div class="course-content">
                    <h3 class="course-title">${c.title}</h3>
                    <p class="course-description">${c.description || "لا يوجد وصف."}</p>
                    <div style="font-size: 0.85rem; color: #574F3F; margin-top: 0.5rem;">
                      👨‍🏫 المعلم: <strong>${c.teacherName || "غير محدد"}</strong>
                    </div>
                  </div>

                  <div class="course-card-actions" style="padding: 1rem 1.25rem; border-top: 1px solid #EFEAE0; background: #F7F5F0;">
                    ${actionButton}
                  </div>
                </div>
                `;
			});

			cardsHTML += `</div>`;
			studentCoursesList.innerHTML = cardsHTML;
		},
		(error) => {
			console.error("خطأ في جلب كورسات السوق للطالب:", error);
			studentCoursesList.innerHTML = `<p style="color:red; text-align:center;">حدث خطأ أثناء تحميل الكورسات المتاحة.</p>`;
		},
	);
}

// طلب اشتراك الطالب في كورس
window.requestCourseEnrollment = async (courseId, courseTitle) => {
	const user = auth.currentUser;
	if (!user) {
		showAlert("يرجى تسجيل الدخول أولاً لطلب الاشتراك.");
		return;
	}

	if (
		await confirmAction(`هل تريد إرسال طلب اشتراك في كورس (${courseTitle})؟`, {
			title: "تأكيد طلب الاشتراك",
			confirmText: "إرسال الطلب",
		})
	) {
		try {
			await addDoc(collection(db, "enrollments"), {
				courseId: courseId,
				courseTitle: courseTitle,
				studentId: user.uid,
				studentName: currentUserData?.fullName || user.displayName || "طالب",
				studentEmail: user.email,
				status: "pending", // pending / approved / rejected
				createdAt: new Date().toISOString(),
			});

			showAlert(
				"تم إرسال طلب الاشتراك بنجاح! في انتظار موافقة الإدارة أو المعلم.",
			);
			loadStudentMarketplaceCourses();
		} catch (err) {
			console.error("خطأ في طلب الاشتراك:", err);
			showAlert("تعذر إرسال طلب الاشتراك. من فضلك حاول مرة أخرى.", "error");
		}
	}
};

// فتح الحصص للطالب المشترك مقبولاً
window.openStudentLessonsModal = (courseId, courseTitle) => {
	window.openLessonsModal(courseId, courseTitle);
	// ملاحظة: إذا أردت إخفاء أزرار الحذف وإضافة الحصص للطالب فقط داخل النافذة، يمكنك التحقق من دور المستخدم (role === 'student').
};

// 11. إدارة المحتوى والحصص (Lessons Management)
let currentActiveCourseId = null;

function extractYouTubeEmbedUrl(inputUrl) {
	if (!inputUrl) return "";

	const iframeMatch = inputUrl.match(/src=["']([^"']+)["']/);
	if (iframeMatch) {
		inputUrl = iframeMatch[1];
	}

	const regExp =
		/^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
	const match = inputUrl.match(regExp);

	if (match && match[2].length === 11) {
		return `https://www.youtube.com/embed/${match[2]}`;
	}

	return inputUrl;
}

function extractYouTubeVideoId(inputUrl) {
	if (!inputUrl) return "";
	const value = String(inputUrl).trim();
	const iframeMatch = value.match(/src=["']([^"']+)["']/i);
	const url = iframeMatch ? iframeMatch[1] : value;
	const match = url.match(
		/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/i,
	);
	return (
		match?.[1] || (url.length === 11 && /^[A-Za-z0-9_-]+$/.test(url) ? url : "")
	);
}

window.openLessonsModal = (courseId, courseTitle) => {
	currentActiveCourseId = courseId;

	const lessonsModal = document.getElementById("lessons-modal");
	const modalTitle = document.getElementById("modal-course-title");

	if (modalTitle) modalTitle.textContent = courseTitle;
	if (lessonsModal) lessonsModal.classList.remove("hidden");

	// إخفاء فئة الإضافة للطالب إذا كان دخوله كطالب
	const addLessonFormWrapper = document.getElementById(
		"add-lesson-form-wrapper",
	);
	if (currentUserData?.role === "student") {
		addLessonFormWrapper?.classList.add("hidden");
	} else {
		addLessonFormWrapper?.classList.remove("hidden");
	}

	listenToCourseLessons(courseId);
};

const lessonsModal = document.getElementById("lessons-modal");
const closeLessonsModalBtn = document.getElementById("close-lessons-modal-btn");
const lessonsOverlay = document.getElementById("lessons-modal-overlay");

const closeLessonsModal = () => {
	if (lessonsModal) lessonsModal.classList.add("hidden");
	currentActiveCourseId = null;
	document.getElementById("add-lesson-form")?.reset();
};

closeLessonsModalBtn?.addEventListener("click", closeLessonsModal);
lessonsOverlay?.addEventListener("click", closeLessonsModal);

function listenToCourseLessons(courseId) {
	const lessonsListEl = document.getElementById("lessons-list");
	const lessonsCountEl = document.getElementById("lessons-count");

	if (!lessonsListEl) return;
	lessonsListEl.innerHTML = `<p style="text-align: center; color: #6B6456;">جاري تحميل الدروس...</p>`;

	const lessonsRef = collection(db, "courses", courseId, "lessons");

	onSnapshot(
		lessonsRef,
		(snapshot) => {
			if (snapshot.empty) {
				lessonsListEl.innerHTML = `<p style="text-align: center; color: #6B6456; padding: 2rem;">لا توجد حصص مضافة لهذا الكورس بعد.</p>`;
				if (lessonsCountEl) lessonsCountEl.textContent = "0";
				return;
			}

			if (lessonsCountEl) lessonsCountEl.textContent = snapshot.size;

			let lessonsHTML = "";
			let index = 1;

			snapshot.forEach((docSnap) => {
				const lesson = docSnap.data();
				const lessonId = docSnap.id;
				const embedUrl = extractYouTubeEmbedUrl(lesson.videoUrl);

				const deleteBtnHtml =
					currentUserData?.role !== "student"
						? `<button class="btn-sm btn-danger" onclick="window.deleteLesson('${courseId}', '${lessonId}')">حذف الحصة 🗑️</button>`
						: "";

				lessonsHTML += `
                <div class="lesson-card" style="background:#fff; border:1px solid #E4DECF; border-radius:12px; padding:1rem; margin-bottom:1rem;">
                  <div class="lesson-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <div class="lesson-title" style="font-weight:bold; color:#16233F;">
                      <span>📌 الحصة ${index}:</span>
                      <span>${lesson.title}</span>
                    </div>
                    ${deleteBtnHtml}
                  </div>
                  
                  <div class="video-responsive-wrapper" style="position:relative; padding-bottom:56.25%; height:0; overflow:hidden; border-radius:8px;">
                    <iframe 
                      src="${embedUrl}" 
                      title="${lesson.title}" 
                      style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                      allowfullscreen>
                    </iframe>
                  </div>
                </div>
            `;
				index++;
			});

			lessonsListEl.innerHTML = lessonsHTML;
		},
		(error) => {
			console.error("خطأ في جلب الدروس:", error);
			lessonsListEl.innerHTML = `<p style="color:red; text-align:center;">حدث خطأ في جلب الدروس: ${error.message}</p>`;
		},
	);
}

// إضافة حصة / درس جديد للكورس الحالي
const addLessonForm = document.getElementById("add-lesson-form");
const lessonTitleInput = document.getElementById("lesson-title");
const lessonVideoInput = document.getElementById("lesson-video-url");

addLessonForm?.addEventListener("submit", async (e) => {
	e.preventDefault();

	if (!currentActiveCourseId) {
		showAlert("لم يتم تحديد كورس لإضافة الدرس إليه.");
		return;
	}

	const title = lessonTitleInput?.value.trim();
	const videoUrl = lessonVideoInput?.value.trim();

	if (!title || !videoUrl) {
		showAlert("يرجى ملء جميع الحقول المطلوبة (عنوان الدرس ورابط الفيديو).");
		return;
	}

	try {
		const lessonsRef = collection(
			db,
			"courses",
			currentActiveCourseId,
			"lessons",
		);
		await addDoc(lessonsRef, {
			title: title,
			videoUrl: videoUrl,
			createdAt: new Date().toISOString(),
		});

		showAlert("تم إضافة الحصة بنجاح! 🚀");
		addLessonForm.reset();
	} catch (error) {
		console.error("❌ خطأ أثناء إضافة الدرس:", error);
		showAlert(
			"تعذر إضافة الحصة. تأكد من البيانات والرابط ثم حاول مرة أخرى.",
			"error",
		);
	}
});

// حذف درس من الكورس
window.deleteLesson = async (courseId, lessonId) => {
	if (
		await confirmAction("هل أنت متأكد من حذف هذه الحصة؟", {
			title: "حذف الحصة",
			confirmText: "حذف الحصة",
		})
	) {
		try {
			const lessonDocRef = doc(db, "courses", courseId, "lessons", lessonId);
			await deleteDoc(lessonDocRef);
			showAlert("تم حذف الحصة بنجاح!");
		} catch (error) {
			console.error("خطأ في حذف الحصة:", error);
			showAlert("حدث خطأ أثناء حذف الحصة: " + error.message);
		}
	}
};

// تحميل الكورسات الخاصة بالطالب المسجل بها فعلياً
async function loadEnrolledCoursesForStudent() {
	const grid = document.getElementById("my-enrolled-courses-grid");
	const enrolledCountSpan = document.getElementById("enrolled-count");

	if (!grid) return;

	try {
		const user = auth.currentUser;
		if (!user) return;

		// جلب طلبات الاشتراك المقبولة الخاصة بالطالب من مجموعة enrollments
		const enrollQuery = query(
			collection(db, "enrollments"),
			where("studentId", "==", user.uid),
			where("status", "==", "approved"),
		);
		const enrollSnap = await getDocs(enrollQuery);

		const approvedCourseIds = [];
		enrollSnap.forEach((docSnap) => {
			approvedCourseIds.push(docSnap.data().courseId);
		});

		if (approvedCourseIds.length === 0) {
			if (enrolledCountSpan) enrolledCountSpan.textContent = "0";
			grid.innerHTML =
				'<p style="color: var(--text-muted); text-align:center;">لم يتم قبول اشتراكك في أي كورس بعد. تصفح الكورسات المتاحة واطلب الانضمام!</p>';
			return;
		}

		// جلب تفاصيل الكورسات التي تم قبول الطالب فيها
		let enrolledCardsHTML = `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 1.25rem; margin-top: 1rem;">`;

		for (const courseId of approvedCourseIds) {
			const courseDocRef = doc(db, "courses", courseId);
			const courseDoc = await getDoc(courseDocRef);

			if (courseDoc.exists()) {
				const course = courseDoc.data();
				enrolledCardsHTML += `
                <div class="course-card" style="background: white; border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <h4 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #16233F;">${course.title}</h4>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${course.description || ""}</p>
                    </div>
                    <button onclick="window.openStudentLessonsModal('${courseId}', '${escapeHtml(course.title)}')" class="btn-primary" style="margin-top: 1rem; width: 100%; background: #3F7857; color: white; border: none; padding: 0.6rem; border-radius: 8px; font-weight: bold; cursor: pointer;">
                        متابعة الحصص والدروس 🎯
                    </button>
                </div>
                `;
			}
		}

		enrolledCardsHTML += `</div>`;
		grid.innerHTML = enrolledCardsHTML;
		if (enrolledCountSpan)
			enrolledCountSpan.textContent = approvedCourseIds.length;
	} catch (error) {
		console.error("خطأ في تحميل الكورسات المسجل بها:", error);
		grid.innerHTML =
			'<p style="color: red; text-align:center;">حدث خطأ أثناء تحميل كورساتك.</p>';
	}
}

// ملاحظة: منطق عرض وإدارة طلبات الاشتراك المعلقة موجود بالفعل
// وبشكل كامل داخل loadAdminDashboardData() أعلى الملف.

// دالة تغيير حالة طلب الاشتراك (موافقة أو رفض) بواسطة الأدمن
window.updateEnrollmentStatus = async (enrollmentId, newStatus) => {
	const actionText = newStatus === "approved" ? "الموافقة على" : "رفض";
	if (
		await confirmAction(`هل أنت متأكد من ${actionText} طلب الاشتراك هذا؟`, {
			title: "تأكيد طلب الاشتراك",
			confirmText: actionText,
		})
	) {
		try {
			const enrollmentRef = doc(db, "enrollments", enrollmentId);
			await updateDoc(enrollmentRef, {
				status: newStatus, // 'approved' أو 'rejected'
			});

			if (newStatus === "approved") {
				showAlert(
					"تمت الموافقة بنجاح! أصبح بإمكان الطالب الآن الدخول ومشاهدة محتوى الحصص.",
				);
			} else {
				showAlert("تم رفض طلب الاشتراك.");
			}
		} catch (error) {
			console.error("خطأ في تحديث حالة الطلب:", error);
			showAlert("حدث خطأ أثناء تحديث الحالة: " + error.message);
		}
	}
};
// 1. تعريف عناصر المودال
const modal = document.getElementById("student-course-modal");
const overlay = document.getElementById("student-modal-overlay");
const closeBtn = document.getElementById("close-student-modal-btn");

function closeStudentModal() {
	if (typeof closeActiveVideo === "function") closeActiveVideo();
	if (modal) {
		modal.classList.add("hidden");
		modal.style.display = "none";
	}
}

if (closeBtn) closeBtn.addEventListener("click", closeStudentModal);
if (overlay) overlay.addEventListener("click", closeStudentModal);

// 2. الدالة الأساسية لفتح المودال وجلب الحصص
window.openStudentCourseModal = async (courseId, courseTitle) => {
	if (!courseId) {
		showAlert("معرف الكورس مفقود!");
		return;
	}

	const user = auth.currentUser;
	if (!user) {
		showAlert("يجب تسجيل الدخول أولاً.");
		return;
	}

	// إظهار المودال
	if (modal) {
		modal.classList.remove("hidden");
		modal.style.display = "flex";
	}

	const titleEl = document.getElementById("student-modal-title");
	const containerEl = document.getElementById("student-lessons-container");

	if (titleEl) titleEl.textContent = courseTitle || "تفاصيل الكورس";
	if (containerEl) {
		containerEl.innerHTML = `<p style="text-align: center; color: #6B6456; padding: 2rem;">جاري التحقق من حالة الاشتراك وتحميل الحصص... ⏳</p>`;
	}

	try {
		// التحقق من اشتراك الطالب
		const q = query(
			collection(db, "enrollments"),
			where("studentId", "==", user.uid),
			where("courseId", "==", courseId),
		);
		const querySnapshot = await getDocs(q);

		let enrollmentStatus = null;
		querySnapshot.forEach((doc) => {
			enrollmentStatus = doc.data().status;
		});

		// جلب الحصص الخاصة بالكورس
		const subLessonsRef = collection(db, "courses", courseId, "lessons");
		const lessonsSnapshot = await getDocs(subLessonsRef);

		let lessonsHTML = "";
		if (!lessonsSnapshot.empty) {
			lessonsSnapshot.forEach((lessonDoc, index) => {
				const lesson = lessonDoc.data();
				const lTitle = lesson.title || lesson.name || `حصة رقم ${index + 1}`;
				let rawUrl =
					lesson.videoUrl ||
					lesson.url ||
					lesson.link ||
					lesson.videoId ||
					lesson.youtubeId ||
					"";

				const videoId = extractYouTubeVideoId(rawUrl);

				lessonsHTML += `
                    <div style="padding: 12px 15px; border: 1px solid #E4DECF; display: flex; justify-content: space-between; align-items: center; background: #F7F5F0; border-radius: 8px;">
                        <span style="font-weight: bold; color: #2A3B5C;">${index + 1}. ${lTitle}</span>
                        ${
													enrollmentStatus === "approved"
														? `
                            ${
															videoId
																? `
                                <button onclick="window.playCourseVideo('${videoId}')" style="padding: 6px 12px; background: #B4863A; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">تشغيل ▶️</button>
                            `
																: `<span style="color: #C75C4A; font-size: 0.85rem;">بدون فيديو</span>`
														}
                        `
														: `<span style="color: #9C9484; font-size: 0.85rem;">🔒 مقفل</span>`
												}
                    </div>
                `;
			});
		} else {
			lessonsHTML = `<p style="text-align: center; color: #6B6456; padding: 20px;">لم يتم إضافة حصص لهذا الكورس بعد.</p>`;
		}

		// عرض المحتوى بناءً على حالة الاشتراك
		if (enrollmentStatus === "approved") {
			containerEl.innerHTML = `
                <div style="padding: 12px; background: #E3F0E7; color: #2F6247; border-radius: 8px; font-weight: bold; font-size: 0.95rem;">
                    ✅ حالة الاشتراك: مقبول - اختر الحصة للمشاهدة
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">${lessonsHTML}</div>
            `;
		} else if (enrollmentStatus === "pending") {
			containerEl.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <h3 style="color: #A66A1E; margin-bottom: 8px;">طلبك قيد المراجعة ⏳</h3>
                    <p style="color: #6B6456; font-size: 0.9rem;">يرجى الانتظار حتى يوافق المشرف على طلبك.</p>
                </div>
            `;
		} else {
			containerEl.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <h3 style="color: #2A3B5C; margin-bottom: 8px;">لست مشتركاً في هذا الكورس 🚫</h3>
                    <button onclick="window.requestCourseEnrollment('${courseId}', '${courseTitle}')" style="padding: 10px 20px; background: #B4863A; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px;">طلب اشتراك الآن 🚀</button>
                </div>
            `;
		}
	} catch (err) {
		console.error("خطأ:", err);
		containerEl.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">حدث خطأ: ${err.message}</p>`;
	}
};

// // ==========================================================================
// // مشغل الفيديو داخل المنصة — YouTube IFrame API
// // ملاحظة: هذا يحافظ على الفيديو داخل واجهة المنصة ويمنع الروابط المباشرة من الظهور.
// // لا يمكن تقنياً منع تسجيل الشاشة أو نسخ فيديو YouTube بنسبة 100% من جهة المتصفح فقط.
// // ==========================================================================
// let activeYouTubePlayer = null;
// let videoProgressTimer = null;
// let youtubeApiPromise = null;

// function loadYouTubeAPI() {
// \tif (window.YT?.Player) return Promise.resolve(window.YT);
// \tif (youtubeApiPromise) return youtubeApiPromise;

// \tyoutubeApiPromise = new Promise((resolve) => {
// \t\tconst previousCallback = window.onYouTubeIframeAPIReady;
// \t\twindow.onYouTubeIframeAPIReady = () => {
// \t\t\tpreviousCallback?.();
// \t\t\tresolve(window.YT);
// \t\t};
// \t\tif (!document.querySelector('script[data-youtube-api]')) {
// \t\t\tconst script = document.createElement("script");
// \t\t\tscript.src = "https://www.youtube.com/iframe_api";
// \t\t\tscript.async = true;
// \t\t\tscript.dataset.youtubeApi = "true";
// \t\t\tdocument.head.appendChild(script);
// \t\t}
// \t});
// \treturn youtubeApiPromise;
// }

// function formatVideoTime(seconds) {
// \tconst value = Math.max(0, Math.floor(Number(seconds) || 0));
// \tconst h = Math.floor(value / 3600);
// \tconst m = Math.floor((value % 3600) / 60);
// \tconst s = value % 60;
// \treturn h > 0
// \t\t? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
// \t\t: `${m}:${String(s).padStart(2, "0")}`;
// }

// function setPlayerButtonState() {
// \tconst btn = document.getElementById("video-play-btn");
// \tif (!btn || !activeYouTubePlayer) return;
// \tconst state = activeYouTubePlayer.getPlayerState?.();
// \tbtn.innerHTML = state === 1
// \t\t? '<i class="fa-solid fa-pause"></i>'
// \t\t: '<i class="fa-solid fa-play"></i>';
// }

// function populateQualityMenu() {
// \tconst select = document.getElementById("video-quality-select");
// \tif (!select || !activeYouTubePlayer) return;
// \tconst levels = activeYouTubePlayer.getAvailableQualityLevels?.() || [];
// \tconst labels = {
// \thighres: "أعلى جودة",
// \thd2160: "4K",
// \thd1440: "1440p",
// \thd1080: "1080p",
// \thd720: "720p",
// \tlarge: "480p",
// \tmedium: "360p",
// \tsmall: "240p",
// \ttiny: "144p",
// \tauto: "تلقائي",
// \t};
// \tconst uniqueLevels = ["auto", ...levels.filter((x) => x !== "auto")];
// \tselect.innerHTML = uniqueLevels.map((level) => `<option value="${level}">${labels[level] || level}</option>`).join("");
// }

// function startVideoProgress() {
// \tclearInterval(videoProgressTimer);
// \tvideoProgressTimer = setInterval(() => {
// \t\tif (!activeYouTubePlayer?.getDuration) return;
// \t\tconst duration = activeYouTubePlayer.getDuration() || 0;
// \t\tconst current = activeYouTubePlayer.getCurrentTime() || 0;
// \t\tconst range = document.getElementById("video-progress");
// \t\tconst currentEl = document.getElementById("video-current-time");
// \t\tconst durationEl = document.getElementById("video-duration");
// \t\tif (range && duration) {
// \t\t\trange.max = duration;
// \t\t\trange.value = current;
// \t\t}
// \t\tif (currentEl) currentEl.textContent = formatVideoTime(current);
// \t\tif (durationEl) durationEl.textContent = formatVideoTime(duration);
// \t}, 500);
// }

// function stopVideoProgress() {
// \tclearInterval(videoProgressTimer);
// \tvideoProgressTimer = null;
// }

// function closeActiveVideo() {
// \tstopVideoProgress();
// \ttry { activeYouTubePlayer?.destroy?.(); } catch {}
// \tactiveYouTubePlayer = null;
// }

// function initVideoPlayer(videoId) {
// \tloadYouTubeAPI().then(() => {
// \t\tconst playerEl = document.getElementById("platform-youtube-player");
// \t\tif (!playerEl || !window.YT?.Player) return;

// \t\tactiveYouTubePlayer = new YT.Player(playerEl, {
// \t\t\tvideoId,
// \t\t\tplayerVars: {
// \t\t\t\tautoplay: 1,
// \t\t\t\tcontrols: 0,
// \t\t\t\tdisablekb: 1,
// \t\t\t\tfs: 0,
// \t\t\t\trel: 0,
// \t\t\t\tmodestbranding: 1,
// \t\t\t\tplaysinline: 1,
// \t\t\t\tiv_load_policy: 3,
// \t\t\t\torigin: window.location.origin,
// \t\t\t},
// \t\tevents: {
// \t\t\t\tonReady: (event) => {
// \t\t\t\tevent.target.setVolume(100);
// \t\t\t\tpopulateQualityMenu();
// \t\t\t\tsetPlayerButtonState();
// \t\t\t\tstartVideoProgress();
// \t\t\t},
// \t\t\tonStateChange: () => {
// \t\t\t\tsetPlayerButtonState();
// \t\t\t\tif (activeYouTubePlayer?.getPlayerState?.() === YT.PlayerState.PLAYING) startVideoProgress();
// \t\t\t},
// \t\t\tonError: () => showAlert("تعذر تشغيل الفيديو. تأكد من أن الفيديو متاح للمشاهدة من خلال المنصة.", "error"),
// \t\t},
// \t\t});
// \t});
// }

// window.playCourseVideo = (videoId) => {
// \tconst containerEl = document.getElementById("student-lessons-container");
// \tif (!containerEl || !videoId) return;

// \tcloseActiveVideo();
// \tcontainerEl.innerHTML = `
// \t\t<div class="platform-video-viewer">
// \t\t\t<div class="platform-video-topbar">
// \t\t\t\t<button type="button" id="back-to-lessons-btn" class="video-back-btn"><i class="fa-solid fa-arrow-right"></i> العودة للحصص</button>
// \t\t\t\t<span><i class="fa-solid fa-shield-halved"></i> مشاهدة داخل المنصة</span>
// \t\t\t</div>
// \t\t\t<div class="platform-video-frame" id="platform-video-frame">
// \t\t\t\t<div id="platform-youtube-player"></div>
// \t\t\t\t<div class="video-overlay-shield" aria-hidden="true"></div>
// \t\t\t\t<div class="platform-video-controls">
// \t\t\t\t\t<div class="video-progress-row">
// \t\t\t\t\t\t<span id="video-current-time">0:00</span>
// \t\t\t\t\t\t<input id="video-progress" type="range" min="0" max="100" value="0" step="0.1" aria-label="تقدم الفيديو">
// \t\t\t\t\t\t<span id="video-duration">0:00</span>
// \t\t\t\t\t</div>
// \t\t\t\t\t<div class="video-controls-row">
// \t\t\t\t\t\t<div class="video-controls-right">
// \t\t\t\t\t\t\t<button type="button" id="video-play-btn" class="video-control-btn" aria-label="تشغيل"><i class="fa-solid fa-play"></i></button>
// \t\t\t\t\t\t\t<button type="button" id="video-mute-btn" class="video-control-btn" aria-label="كتم الصوت"><i class="fa-solid fa-volume-high"></i></button>
// \t\t\t\t\t\t</div>
// \t\t\t\t\t\t<div class="video-controls-left">
// \t\t\t\t\t\t\t<label class="video-select-wrap">السرعة <select id="video-speed-select" aria-label="سرعة الفيديو"><option value="0.5">0.5x</option><option value="0.75">0.75x</option><option value="1" selected>1x</option><option value="1.25">1.25x</option><option value="1.5">1.5x</option><option value="1.75">1.75x</option><option value="2">2x</option></select></label>
// \t\t\t\t\t\t\t<label class="video-select-wrap">الجودة <select id="video-quality-select" aria-label="جودة الفيديو"><option value="auto">تلقائي</option></select></label>
// \t\t\t\t\t\t\t<button type="button" id="video-fullscreen-btn" class="video-control-btn" aria-label="تكبير الفيديو"><i class="fa-solid fa-expand"></i></button>
// \t\t\t\t\t\t</div>
// \t\t\t\t\t</div>
// \t\t\t\t</div>
// \t\t\t</div>
// \t\t\t<p class="video-security-note"><i class="fa-solid fa-lock"></i> هذا المحتوى مخصص للمشتركين ويتم تشغيله من داخل المنصة.</p>
// \t\t</div>
// \t`;

// \tdocument.getElementById("back-to-lessons-btn")?.addEventListener("click", () => {
// \t\tcloseActiveVideo();
// \t\tif (currentActiveCourseId) {
// \t\t\tconst title = document.getElementById("student-modal-title")?.textContent || "تفاصيل الكورس";
// \t\t\twindow.openStudentCourseModal(currentActiveCourseId, title);
// \t\t}
// \t});

// \tdocument.getElementById("video-play-btn")?.addEventListener("click", () => {
// \t\tif (!activeYouTubePlayer) return;
// \t\tconst state = activeYouTubePlayer.getPlayerState();
// \t\tstate === YT.PlayerState.PLAYING ? activeYouTubePlayer.pauseVideo() : activeYouTubePlayer.playVideo();
// \t});

// \tdocument.getElementById("video-mute-btn")?.addEventListener("click", (e) => {
// \t\tif (!activeYouTubePlayer) return;
// \t\tif (activeYouTubePlayer.isMuted()) {
// \t\t\tactiveYouTubePlayer.unMute();
// \t\t\te.currentTarget.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
// \t\t} else {
// \t\t\tactiveYouTubePlayer.mute();
// \t\t\te.currentTarget.innerHTML = '<i class="fa-solid fa-volume-xmark"></i>';
// \t\t}
// \t});

// \tdocument.getElementById("video-progress")?.addEventListener("input", (e) => {
// \t\tif (activeYouTubePlayer) activeYouTubePlayer.seekTo(Number(e.target.value), true);
// \t});

// \tdocument.getElementById("video-speed-select")?.addEventListener("change", (e) => {
// \t\tactiveYouTubePlayer?.setPlaybackRate(Number(e.target.value));
// \t});

// \tdocument.getElementById("video-quality-select")?.addEventListener("change", (e) => {
// \t\tconst quality = e.target.value;
// \t\tif (!activeYouTubePlayer) return;
// \t\tif (quality === "auto") {
// \t\t\tactiveYouTubePlayer.setPlaybackQuality?.("auto");
// \t\t} else {
// \t\t\tactiveYouTubePlayer.setPlaybackQuality?.(quality);
// \t\t}
// \t});

// \tdocument.getElementById("video-fullscreen-btn")?.addEventListener("click", async () => {
// \t\tconst frame = document.getElementById("platform-video-frame");
// \t\tif (!frame) return;
// \t\ttry {
// \t\t\tif (document.fullscreenElement) await document.exitFullscreen();
// \t\t\telse await frame.requestFullscreen();
// \t\t} catch {
// \t\t\tshowAlert("تعذر تكبير الفيديو على هذا الجهاز. جرّب تدوير الهاتف أو استخدام وضع ملء الشاشة من المتصفح.", "warning");
// \t\t}
// \t});

// \t// منع قائمة المتصفح والسحب المباشر فوق منطقة الفيديو.
// \tdocument.getElementById("platform-video-frame")?.addEventListener("contextmenu", (e) => e.preventDefault());
// \tinitVideoPlayer(videoId);
// };
