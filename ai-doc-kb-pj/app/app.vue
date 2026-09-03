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
const docs = ref<any[]>([]);

async function register() {
	await $fetch("/api/auth/register", {
		method: "POST",
		body: { email: email.value, password: password.value },
	});
	await loadDocs(); // 注册即登录（服务端已种cookie），紧接着就能拉到自己的文档
}
async function loadDocs() {
	const res: any = await $fetch("/api/documents");
	docs.value = res.data.items; // 响应是 { ok, data: { items, nextCursor } } } 封包
}

onMounted(loadDocs); // 进页面先拉一次：重复注册 409 或刷新后也能看到列表
</script>

<style scoped>
.container {
	max-width: 480px;
	margin: 40px auto;
	font-family: sans-serif;
}
</style>
