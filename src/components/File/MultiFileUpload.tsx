import { useRef, useState } from "react";
import { useMultipleFileUpload } from "@/hooks/use-file-upload";

export function MultiFileUpload() {
	const inputRef = useRef<HTMLInputElement>(null);
	const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
	const { upload, isUploading, totalProgress, uploadStates } =
		useMultipleFileUpload("attachment");

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = Array.from(e.target.files || []);
		setSelectedFiles(files);
	};

	const handleUpload = () => {
		if (selectedFiles.length > 0) {
			upload(selectedFiles);
		}
	};

	return (
		<div className="space-y-4">
			<input
				ref={inputRef}
				type="file"
				multiple
				onChange={handleFileSelect}
				className="hidden"
			/>

			<button
				type="button"
				onClick={() => inputRef.current?.click()}
				disabled={isUploading}
				className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
			>
				Select Files
			</button>

			{selectedFiles.length > 0 && (
				<div>
					<p className="text-sm text-gray-600 mb-2">
						{selectedFiles.length} file(s) selected
					</p>
					<button
						type="button"
						onClick={handleUpload}
						disabled={isUploading}
						className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
					>
						{isUploading ? "Uploading..." : "Upload All"}
					</button>
				</div>
			)}

			{isUploading && (
				<div className="space-y-2">
					<div className="text-sm text-gray-600">
						Overall Progress: {Math.round(totalProgress)}%
					</div>
					<div className="w-full bg-gray-200 rounded-full h-2">
						<div
							className="bg-blue-500 h-2 rounded-full transition-all"
							style={{ width: `${totalProgress}%` }}
						/>
					</div>

					{Object.entries(uploadStates).map(([index, progress]) => (
						<div key={index} className="text-xs text-gray-500">
							File {Number(index) + 1}: {progress.percentage}%
						</div>
					))}
				</div>
			)}
		</div>
	);
}
