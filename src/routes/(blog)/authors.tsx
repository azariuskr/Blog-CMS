import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Users, FileText } from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthors, authorsQueryOptions } from "@/lib/blog/queries";

export const Route = createFileRoute("/(blog)/authors")({
	loader: async ({ context }) => {
		await context.queryClient.prefetchQuery(authorsQueryOptions());
	},
	component: AuthorsPage,
});

function fmt(n: number) {
	if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
	return String(n);
}

function getInitials(displayName: string) {
	return displayName
		.split(" ")
		.map((part) => part[0] ?? "")
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

function AuthorsPage() {
	const [search, setSearch] = useState("");
	const query = useAuthors();
	const authors = query.data?.data?.items ?? [];

	const filtered = authors.filter((a) => {
		const name = (a.displayName ?? a.username).toLowerCase();
		const bio = (a.bio ?? "").toLowerCase();
		const uname = a.username.toLowerCase();
		const q = search.toLowerCase();
		return name.includes(q) || uname.includes(q) || bio.includes(q);
	});

	const featured = [...authors]
		.sort((a, b) => (b.followersCount ?? 0) - (a.followersCount ?? 0))
		.slice(0, 3);

	return (
		<div>
			{/* Hero */}
			<section className="pt-[180px] pb-[60px] relative">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<p className="text-sm font-bold text-wild-blue-yonder mb-4">Community</p>
					<h1 className="headline headline-1 mb-4">
						Meet the <span className="navy-blue-blog-gradient-text">Authors</span>
					</h1>
					<p className="text-lg text-wild-blue-yonder max-w-xl mb-8">
						Discover the writers, creators, and thinkers behind our content. Follow your favourites and never miss a post.
					</p>

					{/* Search */}
					<div className="relative max-w-md">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-wild-blue-yonder" />
						<input
							type="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search authors…"
							className="w-full h-12 pl-11 pr-4 rounded-xl bg-oxford-blue border border-prussian-blue text-white placeholder:text-yonder-dim focus:outline-none focus:border-carolina-blue transition-colors"
						/>
					</div>
				</div>
				<div className="hidden sm:block absolute top-20 right-0 w-[400px] h-[500px] bg-gradient-to-l from-[#0ea5ea10] to-transparent rounded-full blur-3xl pointer-events-none" />
			</section>

			{/* Loading / Error states */}
			{query.isLoading && (
				<section className="navy-blue-blog-section pt-0">
					<div className="container mx-auto px-4 max-w-[1140px]">
						<div className="animate-pulse opacity-50 py-20 text-center text-wild-blue-yonder">
							Loading authors…
						</div>
					</div>
				</section>
			)}

			{query.isError && (
				<section className="navy-blue-blog-section pt-0">
					<div className="container mx-auto px-4 max-w-[1140px]">
						<p className="text-red-500 py-10 text-center">Failed to load authors.</p>
					</div>
				</section>
			)}

			{/* Featured Authors */}
			{!query.isLoading && !query.isError && !search && featured.length > 0 && (
				<section className="navy-blue-blog-section pt-0">
					<div className="container mx-auto px-4 max-w-[1140px]">
						<div className="flex items-center gap-2 mb-8">
							<Users className="w-5 h-5 text-carolina-blue" />
							<h2 className="text-xl font-bold text-white">Top Authors</h2>
						</div>
						<div className="grid sm:grid-cols-3 gap-6 mb-16">
							{featured.map((author) => {
								const name = author.displayName ?? author.username;
								return (
									<Link
										key={author.username}
										to={`/@${author.username}` as string}
										className="navy-blue-blog-card p-6 rounded-2xl text-center hover:-translate-y-1 transition-transform block"
									>
										<Avatar className="w-20 h-20 mx-auto mb-4 border-4 border-carolina-blue">
											<AvatarImage src={author.avatarUrl ?? undefined} alt={name} />
											<AvatarFallback className="bg-prussian-blue text-xl">
												{getInitials(name)}
											</AvatarFallback>
										</Avatar>
										<h3 className="font-bold text-columbia-blue mb-1">{name}</h3>
										<p className="text-sm text-carolina-blue mb-3">@{author.username}</p>
										<p className="text-xs text-wild-blue-yonder mb-4 line-clamp-2">{author.bio}</p>
										<div className="flex items-center justify-center gap-4 text-xs text-slate-gray">
											<span className="flex items-center gap-1">
												<FileText className="w-3.5 h-3.5" />
												{author.postCount ?? 0}
											</span>
											<span className="flex items-center gap-1">
												<Users className="w-3.5 h-3.5" />
												{fmt(author.followersCount ?? 0)}
											</span>
										</div>
									</Link>
								);
							})}
						</div>

						<h2 className="text-xl font-bold text-white mb-6">All Authors</h2>
					</div>
				</section>
			)}

			{/* Author list */}
			{!query.isLoading && !query.isError && (
				<section className={search ? "navy-blue-blog-section pt-4" : "pb-20"}>
					<div className="container mx-auto px-4 max-w-[1140px]">
						{search && (
							<p className="text-sm text-wild-blue-yonder mb-6">
								{filtered.length} author{filtered.length !== 1 ? "s" : ""} found for "{search}"
							</p>
						)}

						{filtered.length === 0 && (
							<div className="flex flex-col items-center justify-center py-20 text-center">
								<Users className="w-12 h-12 text-yonder-dim mb-4" />
								<p className="text-wild-blue-yonder">No authors match your search.</p>
							</div>
						)}

						<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
							{filtered.map((author) => {
								const name = author.displayName ?? author.username;
								return (
									<Link
										key={author.username}
										to={`/@${author.username}` as string}
										className="navy-blue-blog-card p-5 rounded-2xl flex items-start gap-4 hover:-translate-y-0.5 transition-transform block group"
									>
										<Avatar className="w-14 h-14 shrink-0 border-2 border-prussian-blue group-hover:border-carolina-blue transition-colors">
											<AvatarImage src={author.avatarUrl ?? undefined} alt={name} />
											<AvatarFallback className="bg-prussian-blue">
												{getInitials(name)}
											</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<h3 className="font-bold text-columbia-blue group-hover:text-carolina-blue transition-colors">
												{name}
											</h3>
											<p className="text-xs text-carolina-blue mb-2">@{author.username}</p>
											<p className="text-xs text-wild-blue-yonder line-clamp-2 mb-3">{author.bio}</p>
											<div className="flex items-center gap-3 text-xs text-slate-gray">
												<span className="flex items-center gap-1">
													<FileText className="w-3 h-3" />
													{author.postCount ?? 0} posts
												</span>
												<span className="flex items-center gap-1">
													<Users className="w-3 h-3" />
													{fmt(author.followersCount ?? 0)}
												</span>
											</div>
										</div>
									</Link>
								);
							})}
						</div>
					</div>
				</section>
			)}
		</div>
	)
}
