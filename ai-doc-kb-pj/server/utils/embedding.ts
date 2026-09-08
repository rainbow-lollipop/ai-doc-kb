import OpenAI from "openai";

// 维度运行时从环境变量读（校验用），但数据库列是迁移时定死的 vector(1536)
// 换模型 = 换维度 = 必须新开迁移改列，两边一起改
export function embeddingEnabled(): boolean {
	return process.env.EMBEDDING_ENABLED === "true";
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
	const client = new OpenAI({
		baseURL: process.env.EMBEDDING_BASE_URL,
		apiKey: process.env.EMBEDDING_API_KEY,
	});
	const res = await client.embeddings.create({
		model: process.env.EMBEDDING_MODEL ?? "text-embedding-3-small",
		input: texts,
	});
	const vectors = res.data.map((d) => d.embedding);
	const dim = Number(process.env.EMBEDDING_DIM ?? 1536);
	if (vectors.length && vectors[0]!.length !== dim) {
		// 立刻炸出来，别让错误维度悄悄写进库污染检索
		throw new Error(
			`embedding 维度 ${vectors[0]!.length} 与配置的 ${dim} 不一致，检查EMBEDDING_MODEL/DIM 和迁移`,
		);
	}
	return vectors;
}
