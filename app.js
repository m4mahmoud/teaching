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

// 3. DOM Elements
const authBtn = document.getElementById("auth-btn");
const authModal = document.getElementById("auth-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const modalOverlay = document.getElementById("modal-overlay");

const authForm = document.getElementById("auth-form");
const nameInput = document.getElementById("auth-name");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const nameGroup = document.getElementById("name-group");
const roleGroup = document.getElementById("role-group");
const submitBtn = document.getElementById("auth-submit-btn");

const modalTitle = document.getElementById("modal-title");
const modalSubtitle = document.getElementById("modal-subtitle");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleText = document.getElementById("toggle-text");

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

	if (!role) return;

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

logoutBtn?.addEventListener("click", () => {
	signOut(auth).then(() => {
		closeProfileModal();
		alert("تم تسجيل الخروج بنجاح.");
	});
});

// Submit Form Handler
authForm?.addEventListener("submit", async (e) => {
	e.preventDefault();
	const email = emailInput.value.trim();
	const password = passwordInput.value;

	try {
		if (isSignUp) {
			const fullName = nameInput.value.trim();
			const selectedRole = document.querySelector(
				'input[name="userRole"]:checked',
			)?.value;

			if (!selectedRole) {
				alert("يرجى اختيار نوع الحساب.");
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
				alert(
					"تم إنشاء الحساب بنجاح، لكن يرجى التأكد من ضبط قواعد Firestore Rules لتخزين البيانات.",
				);
				closeAuthModal();
				return;
			}

			alert(`تم إنشاء حساب (${roleTranslations[selectedRole]}) بنجاح!`);
		} else {
			await signInWithEmailAndPassword(auth, email, password);
		}
		closeAuthModal();
	} catch (error) {
		console.error("Auth Error:", error);
		if (error.code === "auth/email-already-in-use") {
			alert(
				"هذا البريد الإلكتروني مسجل بالفعل! اضغط على زر (تسجيل الدخول) للمتابعة.",
			);
		} else if (error.code === "auth/invalid-credential") {
			alert("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
		} else {
			alert("حدث خطأ: " + error.message);
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
					alert("عذراً، هذا الحساب محظور حالياً. يرجى التواصل مع الإدارة.");
					await signOut(auth);
					return;
				}

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
		}
	} else {
		currentUserData = null;
		authBtn?.classList.remove("hidden");
		profileBtn?.classList.add("hidden");
		renderRoleDashboard(null);
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
                        <td><span class="badge-pending" style="color: #d97706; font-weight: bold;">قيد المراجعة 🟡</span></td>
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
						? `<span class="badge-approved" style="color: #16a34a; font-weight: bold;">مقبول 🟢</span>`
						: c.status === "rejected"
							? `<span class="badge-rejected" style="color: #dc2626; font-weight: bold;">مرفوض 🔴</span>`
							: `<span class="badge-pending" style="color: #d97706; font-weight: bold;">قيد المراجعة 🟡</span>`;

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
	if (
		confirm(
			`هل أنت متأكد من تغيير دور هذا المستخدم إلى (${roleTranslations[newRole]})؟`,
		)
	) {
		await updateDoc(doc(db, "users", uid), { role: newRole });
		alert("تم تغيير دور المستخدم بنجاح!");
	}
};

window.deleteUserRecord = async (uid) => {
	if (confirm("هل أنت متأكد من حذف بيانات هذا المستخدم من قاعدة البيانات؟")) {
		await deleteDoc(doc(db, "users", uid));
		alert("تم حذف المستخدم بنجاح!");
	}
};

window.toggleUserBlock = async (uid, isCurrentlyBanned) => {
	const action = isCurrentlyBanned ? "فك حظر" : "حظر";
	if (confirm(`هل أنت متأكد من ${action} هذا المستخدم؟`)) {
		await updateDoc(doc(db, "users", uid), { isBanned: !isCurrentlyBanned });
		alert(`تم ${action} المستخدم بنجاح!`);
	}
};

window.sendResetPasswordLink = async (email) => {
	if (confirm(`إرسال رابط إعادة تعيين كلمة المرور إلى ${email}؟`)) {
		try {
			await sendPasswordResetEmail(auth, email);
			alert("تم إرسال رابط إعادة التعيين بنجاح إلى بريد المستخدم.");
		} catch (err) {
			alert("حدث خطأ أثناء إرسال البريد: " + err.message);
		}
	}
};

window.updateCourseStatus = async (courseId, newStatus) => {
	try {
		await updateDoc(doc(db, "courses", courseId), { status: newStatus });
		alert(
			`تم تحديث حالة الكورس بنجاح إلى (${newStatus === "approved" ? "مقبول" : "مرفوض"})`,
		);
	} catch (err) {
		alert("حدث خطأ في تغيير حالة الكورس: " + err.message);
	}
};

window.toggleCourseFeature = async (courseId, isCurrentlyFeatured) => {
	try {
		await updateDoc(doc(db, "courses", courseId), {
			isFeatured: !isCurrentlyFeatured,
		});
		alert(
			isCurrentlyFeatured
				? "تم إزالة التمييز عن الكورس"
				: "تم تمييز الكورس بنجاح!",
		);
	} catch (err) {
		alert("حدث خطأ: " + err.message);
	}
};

window.deleteCourseRecord = async (courseId) => {
	if (confirm("هل أنت متأكد من حذف هذا الكورس نهائياً؟")) {
		try {
			await deleteDoc(doc(db, "courses", courseId));
			alert("تم حذف الكورس بنجاح!");
		} catch (err) {
			alert("حدث خطأ أثناء حذف الكورس: " + err.message);
		}
	}
};

window.sendGlobalAnnouncement = async () => {
	const input = document.getElementById("global-announcement-input");
	const text = input?.value.trim();
	if (!text) return alert("يرجى كتابة نص الإعلان أولاً.");

	await addDoc(collection(db, "announcements"), {
		message: text,
		createdAt: new Date().toISOString(),
		active: true,
	});

	alert("تم نشر الإعلان بنجاح لجميع المستخدمين!");
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
		if (usersSnapshot.empty) return alert("لا يوجد مستخدمون لتصديرهم.");

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
		alert("حدث خطأ أثناء تصدير ملف المستخدمين.");
	}
}

async function exportCoursesToCSV() {
	try {
		const coursesSnapshot = await getDocs(collection(db, "courses"));
		if (coursesSnapshot.empty) return alert("لا توجد كورسات لتصديرها.");

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
		alert("حدث خطأ أثناء تصدير ملف الكورسات.");
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
		manageContentButton = `<p style="font-size: 0.85rem; color: #64748b; text-align: center; margin: 0;">في انتظار موافقة الأدمن لإضافة المحتوى</p>`;
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
				teacherCoursesList.innerHTML = `<p style="text-align:center; color:#64748b;">لم تقم بإنشاء أي كورسات حتى الآن.</p>`;
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
		alert("يرجى تسجيل الدخول أولاً كـ معلم لإضافة كورس.");
		return;
	}

	const title = courseTitleInput.value.trim();
	const price = Number(coursePriceInput.value);
	const description = courseDescInput.value.trim();

	if (!title || isNaN(price)) {
		alert("يرجى ملء جميع الحقول المطلوبة بشكل صحيح.");
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

		alert("تم تقديم الكورس بنجاح وهو الآن قيد المراجعة من الأدمن!");
		closeCourseModal();
	} catch (err) {
		console.error("خطأ أثناء حفظ الكورس:", err);
		if (err.code === "permission-denied") {
			alert("تم الرفض بسبب صلاحيات Firestore.");
		} else {
			alert("حدث خطأ أثناء حفظ الكورس: " + err.message);
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
				studentCoursesList.innerHTML = `<p style="text-align:center; color:#64748b;">لا توجد كورسات متاحة للاشتراك حالياً.</p>`;
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
					actionButton = `<button class="btn-success" style="width:100%; padding:0.6rem; border-radius:8px; border:none; font-weight:bold; color:white; background:#16a34a;" onclick="window.openStudentLessonsModal('${courseId}', '${escapeHtml(c.title)}')">📚 دخول إلى محتوى الحصص</button>`;
				} else if (enrollStatus === "pending") {
					actionButton = `<button class="btn-warning" style="width:100%; padding:0.6rem; border-radius:8px; border:none; font-weight:bold; color:#78350f; background:#fef3c7;" disabled>⏳ طلب الاشتراك قيد المراجعة</button>`;
				} else {
					actionButton = `<button class="btn-primary" style="width:100%; padding:0.6rem; border-radius:8px; border:none; font-weight:bold; color:white; background:#2563eb; cursor:pointer;" onclick="window.requestCourseEnrollment('${courseId}', '${escapeHtml(c.title)}')">🛒 طلب الاشتراك في الكورس</button>`;
				}

				cardsHTML += `
                <div class="course-card-modern">
                  <div class="course-header-banner">
                    <div class="banner-top-bar">
                      <span class="course-category-badge">📚 ${c.subject || "تعليمي"}</span>
                      ${c.isFeatured ? '<span class="badge-featured" style="background:#fbbf24; color:#78350f; padding:0.2rem 0.5rem; border-radius:4px; font-size:0.75rem; font-weight:bold;">مميز ⭐</span>' : ""}
                    </div>
                    <div class="banner-price-tag">
                      ${c.price ? `${c.price} <small>ج.م</small>` : "مجاني"}
                    </div>
                  </div>

                  <div class="course-content">
                    <h3 class="course-title">${c.title}</h3>
                    <p class="course-description">${c.description || "لا يوجد وصف."}</p>
                    <div style="font-size: 0.85rem; color: #475569; margin-top: 0.5rem;">
                      👨‍🏫 المعلم: <strong>${c.teacherName || "غير محدد"}</strong>
                    </div>
                  </div>

                  <div class="course-card-actions" style="padding: 1rem 1.25rem; border-top: 1px solid #f1f5f9; background: #fafafa;">
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
		alert("يرجى تسجيل الدخول أولاً لطلب الاشتراك.");
		return;
	}

	if (confirm(`هل تريد إرسال طلب اشتراك في كورس (${courseTitle})؟`)) {
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

			alert("تم إرسال طلب الاشتراك بنجاح! في انتظار موافقة الإدارة أو المعلم.");
			loadStudentMarketplaceCourses();
		} catch (err) {
			console.error("خطأ في طلب الاشتراك:", err);
			alert("حدث خطأ أثناء إرسال طلب الاشتراك: " + err.message);
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
	lessonsListEl.innerHTML = `<p style="text-align: center; color: #64748b;">جاري تحميل الدروس...</p>`;

	const lessonsRef = collection(db, "courses", courseId, "lessons");

	onSnapshot(
		lessonsRef,
		(snapshot) => {
			if (snapshot.empty) {
				lessonsListEl.innerHTML = `<p style="text-align: center; color: #64748b; padding: 2rem;">لا توجد حصص مضافة لهذا الكورس بعد.</p>`;
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
                <div class="lesson-card" style="background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:1rem; margin-bottom:1rem;">
                  <div class="lesson-card-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                    <div class="lesson-title" style="font-weight:bold; color:#1e293b;">
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
		alert("لم يتم تحديد كورس لإضافة الدرس إليه.");
		return;
	}

	const title = lessonTitleInput?.value.trim();
	const videoUrl = lessonVideoInput?.value.trim();

	if (!title || !videoUrl) {
		alert("يرجى ملء جميع الحقول المطلوبة (عنوان الدرس ورابط الفيديو).");
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

		alert("تم إضافة الحصة بنجاح! 🚀");
		addLessonForm.reset();
	} catch (error) {
		console.error("❌ خطأ أثناء إضافة الدرس:", error);
		alert("حدث خطأ أثناء إضافة الدرس: " + error.message);
	}
});

// حذف درس من الكورس
window.deleteLesson = async (courseId, lessonId) => {
	if (confirm("هل أنت متأكد من حذف هذه الحصة؟")) {
		try {
			const lessonDocRef = doc(db, "courses", courseId, "lessons", lessonId);
			await deleteDoc(lessonDocRef);
			alert("تم حذف الحصة بنجاح!");
		} catch (error) {
			console.error("خطأ في حذف الحصة:", error);
			alert("حدث خطأ أثناء حذف الحصة: " + error.message);
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
                        <h4 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #1e293b;">${course.title}</h4>
                        <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1rem;">${course.description || ""}</p>
                    </div>
                    <button onclick="window.openStudentLessonsModal('${courseId}', '${escapeHtml(course.title)}')" class="btn-primary" style="margin-top: 1rem; width: 100%; background: #16a34a; color: white; border: none; padding: 0.6rem; border-radius: 8px; font-weight: bold; cursor: pointer;">
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
	if (confirm(`هل أنت متأكد من ${actionText} طلب الاشتراك هذا؟`)) {
		try {
			const enrollmentRef = doc(db, "enrollments", enrollmentId);
			await updateDoc(enrollmentRef, {
				status: newStatus, // 'approved' أو 'rejected'
			});

			if (newStatus === "approved") {
				alert(
					"تمت الموافقة بنجاح! أصبح بإمكان الطالب الآن الدخول ومشاهدة محتوى الحصص.",
				);
			} else {
				alert("تم رفض طلب الاشتراك.");
			}
		} catch (error) {
			console.error("خطأ في تحديث حالة الطلب:", error);
			alert("حدث خطأ أثناء تحديث الحالة: " + error.message);
		}
	}
};
// 1. تعريف عناصر المودال
const modal = document.getElementById("student-course-modal");
const overlay = document.getElementById("student-modal-overlay");
const closeBtn = document.getElementById("close-student-modal-btn");

function closeStudentModal() {
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
		alert("معرف الكورس مفقود!");
		return;
	}

	const user = auth.currentUser;
	if (!user) {
		alert("يجب تسجيل الدخول أولاً.");
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
		containerEl.innerHTML = `<p style="text-align: center; color: #64748b; padding: 2rem;">جاري التحقق من حالة الاشتراك وتحميل الحصص... ⏳</p>`;
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

				let videoId = rawUrl;
				if (rawUrl.includes("youtube.com/watch?v=")) {
					videoId = rawUrl.split("v=")[1]?.split("&")[0];
				} else if (rawUrl.includes("youtu.be/")) {
					videoId = rawUrl.split("youtu.be/")[1]?.split("?")[0];
				}

				lessonsHTML += `
                    <div style="padding: 12px 15px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-radius: 8px;">
                        <span style="font-weight: bold; color: #334155;">${index + 1}. ${lTitle}</span>
                        ${
													enrollmentStatus === "approved"
														? `
                            ${
															videoId
																? `
                                <button onclick="window.playCourseVideo('${videoId}')" style="padding: 6px 12px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-size: 0.9rem;">تشغيل ▶️</button>
                            `
																: `<span style="color: #ef4444; font-size: 0.85rem;">بدون فيديو</span>`
														}
                        `
														: `<span style="color: #94a3b8; font-size: 0.85rem;">🔒 مقفل</span>`
												}
                    </div>
                `;
			});
		} else {
			lessonsHTML = `<p style="text-align: center; color: #64748b; padding: 20px;">لم يتم إضافة حصص لهذا الكورس بعد.</p>`;
		}

		// عرض المحتوى بناءً على حالة الاشتراك
		if (enrollmentStatus === "approved") {
			containerEl.innerHTML = `
                <div style="padding: 12px; background: #dcfce7; color: #166534; border-radius: 8px; font-weight: bold; font-size: 0.95rem;">
                    ✅ حالة الاشتراك: مقبول - اختر الحصة للمشاهدة
                </div>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">${lessonsHTML}</div>
            `;
		} else if (enrollmentStatus === "pending") {
			containerEl.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <h3 style="color: #d97706; margin-bottom: 8px;">طلبك قيد المراجعة ⏳</h3>
                    <p style="color: #64748b; font-size: 0.9rem;">يرجى الانتظار حتى يوافق المشرف على طلبك.</p>
                </div>
            `;
		} else {
			containerEl.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <h3 style="color: #334155; margin-bottom: 8px;">لست مشتركاً في هذا الكورس 🚫</h3>
                    <button onclick="window.requestCourseEnrollment('${courseId}', '${courseTitle}')" style="padding: 10px 20px; background: #2563eb; color: #ffffff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: 10px;">طلب اشتراك الآن 🚀</button>
                </div>
            `;
		}
	} catch (err) {
		console.error("خطأ:", err);
		containerEl.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">حدث خطأ: ${err.message}</p>`;
	}
};

// 3. تشغيل الفيديو داخل المودال
window.playCourseVideo = (videoId) => {
	const containerEl = document.getElementById("student-lessons-container");
	if (!containerEl) return;

	containerEl.innerHTML = `
        <button onclick="location.reload()" style="background: none; border: none; color: #2563eb; cursor: pointer; font-weight: bold; font-size: 0.9rem; margin-bottom: 10px; display: block;">
            🔙 العودة لقائمة الحصص
        </button>
        <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; background: #000; border-radius: 8px; overflow: hidden;">
            <iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        </div>
    `;
};
