import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
	MapPin,
	Globe,
	Twitter,
	Github,
	Linkedin,
	Users,
	FileText,
	Eye,
	Calendar,
	Clock,
	BookMarked,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuthorProfile, usePublishedPosts, authorProfileQueryOptions, useToggleFollow, usePublicReadingListsByUser } from "@/lib/blog/queries";
import { useSession } from "@/lib/auth/auth-client";
import { siteConfig } from "@/lib/seo/siteConfig";

export const Route = createFileRoute("/(blog)/@{$username}/")({
	loader: async ({ context, params }) => {
		const username = params.username.replace(/^@/, "");
		await context.queryClient.prefetchQuery(authorProfileQueryOptions(username));
	},
	head: ({ params }) => {
		const username = params.username.replace(/^@/, "");
		const fullTitle = `@${username} | ${siteConfig.name}`;
		const profileUrl = `${siteConfig.url}/@${username}`;
		return {
			meta: [
				{ title: fullTitle },
				{ name: "description", content: `${username}'s profile on ${siteConfig.name}` },
				{ property: "og:type", content: "profile" },
				{ property: "og:site_name", content: siteConfig.name },
				{ property: "og:title", content: fullTitle },
				{ property: "og:description", content: `${username}'s profile on ${siteConfig.name}` },
				{ property: "og:url", content: profileUrl },
				{ property: "og:image", content: siteConfig.ogImage },
				{ name: "twitter:card", content: "summary" },
				{ name: "twitter:site", content: siteConfig.twitterHandle },
				{ name: "twitter:title", content: fullTitle },
			],
		};
	},
	component: AuthorProfilePage,
});

function AuthorProfilePage() {
	const { username } = Route.useParams();
	const { data: session } = useSession();
	const userId = session?.user?.id;
	const profileQuery = useAuthorProfile(username);
	const profile = (profileQuery.data as any)?.data ?? null;
	const toggleFollow = useToggleFollow();
	const [isFollowing, setIsFollowing] = useState(false);
	const [profileTab, setProfileTab] = useState<"posts" | "lists">("posts");
	const publicListsQuery = usePublicReadingListsByUser(profile?.userId);
	const publicLists = (publicListsQuery.data as any)?.ok ? ((publicListsQuery.data as any).data as any[]) : [];

	const postsQuery = usePublishedPosts({
		authorId: profile?.userId ?? undefined,
		limit: 10,
	});
	const authorPosts = (postsQuery.data as any)?.data?.items ?? [];

	if (profileQuery.isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<p className="text-wild-blue-yonder">Loading profile…</p>
			</div>
		);
	}

	if (!profile && !profileQuery.isLoading) {
		return (
			<div className="flex flex-col items-center justify-center min-h-screen text-center">
				<FileText className="w-12 h-12 text-wild-blue-yonder mb-4" />
				<p className="text-wild-blue-yonder text-lg">Author not found</p>
			</div>
		);
	}

	const displayName = profile!.displayName ?? username;
	const joinedLabel = profile!.createdAt
		? new Date(profile!.createdAt).toLocaleDateString("en-US", {
				year: "numeric",
				month: "long",
			})
		: "";

	return (
		<div>
			{/* Cover Banner */}
			<div className="relative h-[300px] md:h-[380px] mt-[72px]">
				{profile!.coverUrl ? (
					<img
						src={profile!.coverUrl}
						alt={`${displayName}'s cover`}
						className="w-full h-full object-cover"
					/>
				) : (
					<div className="w-full h-full bg-gradient-to-br from-[hsl(199,89%,30%)] to-[hsl(222,47%,20%)]" />
				)}
				<div className="absolute inset-0 bg-gradient-to-t from-oxford-blue-2 via-oxford-blue-2/40 to-transparent" />
			</div>

			{/* Profile section */}
			<div className="container mx-auto px-4 max-w-[1140px]">
				{/* Avatar + actions row */}
				<div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 mb-8 relative z-10">
					<Avatar className="w-28 h-28 border-4 border-oxford-blue-2 ring-2 ring-carolina-blue">
						{profile!.avatarUrl && (
							<AvatarImage src={profile!.avatarUrl} alt={displayName} />
						)}
						<AvatarFallback className="bg-gradient-to-br from-carolina-blue to-blog-teal text-white text-3xl font-bold">
							{displayName[0]}
						</AvatarFallback>
					</Avatar>
					<div className="flex items-center gap-3">
						<Button
							className="bg-gradient-to-r from-carolina-blue to-blog-teal hover:opacity-90 text-white"
							onClick={() => {
								if (!userId || !profile?.userId) return;
								setIsFollowing(!isFollowing);
								toggleFollow.mutate({ followerId: userId, followingId: profile.userId });
							}}
							disabled={!userId || toggleFollow.isPending}
						>
							{isFollowing ? "Following" : "Follow"}
						</Button>
						<Button
							variant="outline"
							className="border-prussian-blue text-wild-blue-yonder hover:bg-prussian-blue"
						>
							Message
						</Button>
					</div>
				</div>

				{/* Author info */}
				<div className="mb-10">
					<h1 className="text-3xl font-bold text-white mb-2">{displayName}</h1>
					<p className="text-wild-blue-yonder mb-2">@{username}</p>

					{profile!.bio && (
						<p className="text-shadow-blue max-w-2xl mb-5 leading-relaxed">
							{profile!.bio}
						</p>
					)}

					{/* Meta row */}
					<div className="flex flex-wrap items-center gap-4 text-sm text-wild-blue-yonder mb-5">
						{profile!.location && (
							<div className="flex items-center gap-1.5">
								<MapPin className="w-4 h-4" />
								{profile!.location}
							</div>
						)}
						{profile!.website && (
							<a
								href={profile!.website}
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center gap-1.5 hover:text-carolina-blue transition-colors"
							>
								<Globe className="w-4 h-4" />
								{profile!.website.replace(/^https?:\/\//, "")}
							</a>
						)}
						{joinedLabel && (
							<div className="flex items-center gap-1.5">
								<Calendar className="w-4 h-4" />
								Joined {joinedLabel}
							</div>
						)}
					</div>

					{/* Social links */}
					<div className="flex items-center gap-3">
						{profile!.twitterHandle && (
							<a
								href={`https://twitter.com/${profile!.twitterHandle}`}
								target="_blank"
								rel="noopener noreferrer"
								className="btn-icon"
								aria-label="Twitter"
							>
								<Twitter className="w-4 h-4" />
							</a>
						)}
						{profile!.githubHandle && (
							<a
								href={`https://github.com/${profile!.githubHandle}`}
								target="_blank"
								rel="noopener noreferrer"
								className="btn-icon"
								aria-label="GitHub"
							>
								<Github className="w-4 h-4" />
							</a>
						)}
						{profile!.linkedinHandle && (
							<a
								href={`https://linkedin.com/in/${profile!.linkedinHandle}`}
								target="_blank"
								rel="noopener noreferrer"
								className="btn-icon"
								aria-label="LinkedIn"
							>
								<Linkedin className="w-4 h-4" />
							</a>
						)}
					</div>
				</div>

				{/* Stats row */}
				<div className="grid grid-cols-3 gap-6 p-6 navy-blue-blog-card rounded-2xl mb-12 max-w-sm">
					<div className="text-center">
						<div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-white mb-1">
							<FileText className="w-5 h-5 text-carolina-blue" />
							{profile!.postCount ?? 0}
						</div>
						<p className="text-xs text-wild-blue-yonder">Posts</p>
					</div>
					<div className="text-center border-x border-prussian-blue">
						<div className="flex items-center justify-center gap-1.5 text-2xl font-bold text-white mb-1">
							<Users className="w-5 h-5 text-carolina-blue" />
							{(profile!.followersCount ?? 0).toLocaleString()}
						</div>
						<p className="text-xs text-wild-blue-yonder">Followers</p>
					</div>
					<div className="text-center">
						<div className="text-2xl font-bold text-white mb-1">
							{profile!.followingCount ?? 0}
						</div>
						<p className="text-xs text-wild-blue-yonder">Following</p>
					</div>
				</div>

				{/* Tabs */}
				<div className="pb-20">
					<div className="flex items-center gap-1 mb-8 border-b border-prussian-blue">
						<button
							type="button"
							onClick={() => setProfileTab("posts")}
							className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors -mb-px ${profileTab === "posts" ? "border-carolina-blue text-carolina-blue" : "border-transparent text-wild-blue-yonder hover:text-alice-blue"}`}
						>
							Posts
						</button>
						<button
							type="button"
							onClick={() => setProfileTab("lists")}
							className={`pb-2.5 px-1 text-sm font-medium border-b-2 transition-colors -mb-px ${profileTab === "lists" ? "border-carolina-blue text-carolina-blue" : "border-transparent text-wild-blue-yonder hover:text-alice-blue"}`}
						>
							Lists
						</button>
					</div>

					{profileTab === "posts" && (
						<>
							<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
								{authorPosts.map((post: any) => (
									<article
										key={post.id}
										className="navy-blue-blog-card rounded-2xl overflow-hidden transition-all hover:-translate-y-1"
									>
										<figure className="aspect-video overflow-hidden">
											<img
												src={post.featuredImageUrl ?? ""}
												alt={post.title}
												className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
												loading="lazy"
											/>
										</figure>
										<div className="p-5">
											<div className="flex items-center justify-between gap-4 mb-3">
												<span className="navy-blue-blog-badge">
													{post.category?.name ?? "Uncategorized"}
												</span>
												<div className="flex items-center gap-1 text-xs text-slate-gray">
													<Eye className="w-3.5 h-3.5" />
													<span>{(post.viewCount ?? 0).toLocaleString()}</span>
												</div>
											</div>
											<h3 className="text-columbia-blue font-semibold mb-3 text-lg hover:text-carolina-blue transition-colors line-clamp-2">
												<Link to={"/$slug" as string} params={{ slug: post.slug } as any}>
													{post.title}
												</Link>
											</h3>
											<p className="text-wild-blue-yonder text-sm mb-4 line-clamp-2">
												{post.excerpt}
											</p>
											<div className="flex items-center justify-between text-xs text-slate-gray">
												<span>
													{post.publishedAt
														? new Date(post.publishedAt).toLocaleDateString("en-US", {
																month: "short",
																day: "numeric",
																year: "numeric",
															})
														: ""}
												</span>
												<div className="flex items-center gap-1">
													<Clock className="w-3.5 h-3.5" />
												</div>
											</div>
										</div>
									</article>
								))}
							</div>
							{authorPosts.length === 0 && (
								<div className="flex flex-col items-center justify-center py-20 text-center">
									<FileText className="w-12 h-12 text-wild-blue-yonder mb-4" />
									<p className="text-wild-blue-yonder">No posts yet</p>
								</div>
							)}
						</>
					)}

					{profileTab === "lists" && (
						<>
							{publicLists.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-20 text-center">
									<BookMarked className="w-12 h-12 text-wild-blue-yonder mb-4" />
									<p className="text-wild-blue-yonder">No public lists yet</p>
								</div>
							) : (
								<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
									{publicLists.map((list: any) => (
										<Link
											key={list.id}
											to={"/reading-lists/$listId" as string}
											params={{ listId: list.id } as any}
											className="navy-blue-blog-card rounded-2xl p-5 flex flex-col gap-3 hover:-translate-y-1 transition-all"
										>
											<div className="flex items-start justify-between gap-2">
												<h3 className="text-columbia-blue font-semibold text-lg line-clamp-2 hover:text-carolina-blue transition-colors">
													{list.name}
												</h3>
												<BookMarked className="w-5 h-5 text-carolina-blue shrink-0 mt-0.5" />
											</div>
											{list.description && (
												<p className="text-wild-blue-yonder text-sm line-clamp-2">
													{list.description}
												</p>
											)}
											<p className="text-xs text-slate-gray mt-auto">
												{list.postCount ?? 0} post{(list.postCount ?? 0) !== 1 ? "s" : ""}
											</p>
										</Link>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
