<template>
	<div class="container">
		<h1>AI 文档知识库</h1>
		<input
			v-model="email"
			placeholder="email" />
		<input
			v-model="password"
			type="password"
			placeholder="password" />
		<button @click="register">注册/登录</button>
		<select
			v-model="currentWsId"
			@change="switchWs">
			<option
				v-for="w in workspaces"
				:key="w.id"
				:value="w.id">
				{{ w.name }}
			</option>
		</select>
		<ul>
			<li
				v-for="d in docs"
				:key="d.id">
				{{ d.name }}({{ d.status }})
			</li>
		</ul>
	</div>
</template>

<script setup lang="ts">
// 页面里 $fetch 走浏览器，会自动带 cookie（和测试环境不同），无需手动管理会话
const email = ref("me@test.dev");
const password = ref("password123");
const workspaces = ref<{ id: string; name: string; role: string }[]>([]);
const currentWsId = ref("");
const docs = ref<any[]>([]);

async function register() {
	try {
		await $fetch("/api/auth/register", {
			method: "POST",
			body: { email: email.value, password: password.value },
		});
	} catch {
		/* 已注册（409）没关系 */
	}
	await loadWorkspaces();
	await loadDocs(); // 注册即登录（服务端已种cookie），紧接着就能拉到自己的文档
}

async function loadWorkspaces() {
	const res: any = await $fetch("/api/workspaces");
	workspaces.value = res.data;
	// localStorage 里存的id可能已被删，失效就兜底选第一个
	const saved = localStorage.getItem("wsId") ?? "";
	const found = res.data.find((w: any) => w.id === saved);
	currentWsId.value = found ? saved : (res.data[0]?.id ?? "");
	localStorage.setItem("wsId", currentWsId.value);
}

async function loadDocs() {
	if (!currentWsId.value) {
		docs.value = [];
		return;
	}
	// 当前个工作区通过请求头传给后端（requireMember 读的就是它）
	const res: any = await $fetch("/api/documents", {
		headers: {
			"x-workspace-id": currentWsId.value,
		},
	});
	docs.value = res.data.items; // 响应是 { ok, data: { items, nextCursor } } } 封包
}

function switchWs() {
	localStorage.setItem("wsId", currentWsId.value);
	loadDocs();
}

// 进页面先拉一次：重复注册 409 或刷新后也能看到列表
onMounted(async () => {
	await loadWorkspaces();
	await loadDocs();
});
</script>

<style scoped>
.container {
	max-width: 480px;
	margin: 40px auto;
	font-family: sans-serif;
}
</style>
