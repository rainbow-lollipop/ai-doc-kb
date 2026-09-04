// 纯函数：不碰数据库/Redis/文件系统，可独立单测
// 策略：固定窗口 + 重叠。重叠保证「被切断的句子」至少在一片里是完整的
export function chunkText(text: string, size = 500, overlap = 50): string[] {
	if (!text) return [];
	const chunks: string[] = [];
	let start = 0;
	while (start < text.length) {
		const piece = text.slice(start, start + size);
		if (piece.trim()) chunks.push(piece); // 纯空白片（分页符/连续换行）没有检索价值，丢弃
		start += size - overlap; // 每步前进 size-overlap,形成 overlap 重叠
	}
	return chunks;
}
