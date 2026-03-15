import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Github, Twitter, Linkedin, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/(blog)/about")({
	component: AboutPage,
});

const team = [
	{
		name: "Alex Chen",
		role: "Founder & Lead Developer",
		avatar: "https://i.pravatar.cc/150?img=11",
		bio: "Full-stack developer with 10+ years of experience building scalable web applications.",
		twitter: "#",
		github: "#",
		linkedin: "#",
	},
	{
		name: "Sarah Kim",
		role: "UI/UX Designer",
		avatar: "https://i.pravatar.cc/150?img=12",
		bio: "Design enthusiast focused on creating beautiful and intuitive user experiences.",
		twitter: "#",
		github: "#",
		linkedin: "#",
	},
	{
		name: "Mike Johnson",
		role: "Backend Engineer",
		avatar: "https://i.pravatar.cc/150?img=13",
		bio: "Database expert and API architect specializing in high-performance systems.",
		twitter: "#",
		github: "#",
		linkedin: "#",
	},
];

const stats = [
	{ value: "10K+", label: "Active Users" },
	{ value: "50K+", label: "Articles Published" },
	{ value: "99.9%", label: "Uptime" },
	{ value: "24/7", label: "Support" },
];

function AboutPage() {
	return (
		<div>
			{/* Hero */}
			<section className="pt-[180px] pb-[70px] relative">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="max-w-3xl">
						<p className="text-sm font-bold text-[hsl(216,33%,68%)] mb-5">About Us</p>
						<h1 className="headline headline-1 mb-5">
							Building the Future of{" "}
							<span className="navy-blue-blog-gradient-text">Content Management</span>
						</h1>
						<p className="text-lg text-[hsl(216,33%,68%)] leading-relaxed">
							BlogCMS is a modern, Git-backed content management system designed for developers
							and content creators who demand speed, flexibility, and reliability. Our mission
							is to make content publishing as seamless as writing code.
						</p>
					</div>
				</div>
				<div className="hidden sm:block absolute top-20 right-0 w-[500px] h-[500px] bg-gradient-to-l from-[#0ea5ea20] to-transparent rounded-full blur-3xl pointer-events-none" />
			</section>

			{/* Stats */}
			<section className="navy-blue-blog-section pt-0">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						{stats.map((stat) => (
							<div
								key={stat.label}
								className="navy-blue-blog-card p-8 rounded-2xl text-center transition-all hover:-translate-y-1"
							>
								<p className="text-4xl font-bold navy-blue-blog-gradient-text mb-2">{stat.value}</p>
								<p className="text-[hsl(216,33%,68%)]">{stat.label}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* Story */}
			<section className="navy-blue-blog-section">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="grid lg:grid-cols-2 gap-16 items-center">
						<div>
							<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-6">
								Our <span className="navy-blue-blog-gradient-text">Story</span>
							</h2>
							<div className="space-y-4 text-[hsl(216,33%,68%)]">
								<p>
									BlogCMS was born from a simple frustration: existing CMS solutions were either
									too bloated, too slow, or too rigid for modern development workflows.
								</p>
								<p>
									We envisioned a platform where content changes could be previewed instantly,
									where version control was built-in, and where developers could work with
									familiar tools like Git and Markdown.
								</p>
								<p>
									Today, BlogCMS powers thousands of blogs, documentation sites, and content
									platforms worldwide. Our Git-backed architecture ensures that every change
									is tracked, reversible, and deployable with confidence.
								</p>
							</div>
						</div>
						<div className="relative">
							<img
								src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&h=400&fit=crop"
								alt="Team collaborating on content management solutions"
								className="rounded-2xl w-full"
							/>
							<div className="absolute -bottom-6 -left-6 navy-blue-blog-card p-6 rounded-2xl">
								<p className="text-3xl font-bold navy-blue-blog-gradient-text">2024</p>
								<p className="text-sm text-[hsl(216,33%,68%)]">Founded</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Why Choose Us */}
			<section className="navy-blue-blog-section">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-2.5 text-center">
						Why Choose <span className="navy-blue-blog-gradient-text">BlogCMS</span>
					</h2>
					<p className="text-lg text-[hsl(216,33%,68%)] mb-16 text-center max-w-2xl mx-auto">
						Built with modern technologies and best practices in mind
					</p>

					<div className="grid md:grid-cols-3 gap-8">
						<div className="navy-blue-blog-card p-8 rounded-2xl text-center transition-all hover:-translate-y-1">
							<div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0ea5ea] to-[#0bd1d1] mx-auto mb-6 grid place-items-center">
								<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-[hsl(199,69%,84%)] mb-4">Lightning Fast</h3>
							<p className="text-[hsl(216,33%,68%)]">
								Built on TanStack Start and React 19 for blazing-fast performance. Sub-second page loads guaranteed.
							</p>
						</div>

						<div className="navy-blue-blog-card p-8 rounded-2xl text-center transition-all hover:-translate-y-1">
							<div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0ea5ea] to-[#0bd1d1] mx-auto mb-6 grid place-items-center">
								<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-[hsl(199,69%,84%)] mb-4">Git-Backed</h3>
							<p className="text-[hsl(216,33%,68%)]">
								Every change is versioned. Roll back anytime, collaborate with confidence.
							</p>
						</div>

						<div className="navy-blue-blog-card p-8 rounded-2xl text-center transition-all hover:-translate-y-1">
							<div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#0ea5ea] to-[#0bd1d1] mx-auto mb-6 grid place-items-center">
								<svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
								</svg>
							</div>
							<h3 className="text-xl font-bold text-[hsl(199,69%,84%)] mb-4">Live Preview</h3>
							<p className="text-[hsl(216,33%,68%)]">
								See your changes instantly. No more waiting for builds or deployments.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Team */}
			<section className="navy-blue-blog-section">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-2.5 text-center">
						Meet the <span className="navy-blue-blog-gradient-text">Team</span>
					</h2>
					<p className="text-lg text-[hsl(216,33%,68%)] mb-16 text-center max-w-2xl mx-auto">
						The passionate people behind BlogCMS
					</p>

					<div className="grid md:grid-cols-3 gap-8">
						{team.map((member) => (
							<div
								key={member.name}
								className="navy-blue-blog-card p-8 rounded-2xl text-center transition-all hover:-translate-y-1"
							>
								<Avatar className="w-24 h-24 mx-auto mb-6 border-4 border-[hsl(199,89%,49%)]">
									<AvatarImage src={member.avatar} alt={`${member.name}'s profile photo`} />
									<AvatarFallback className="bg-[hsl(216,33%,20%)] text-2xl">
										{member.name.charAt(0)}
									</AvatarFallback>
								</Avatar>
								<h3 className="text-xl font-bold text-[hsl(199,69%,84%)] mb-1">{member.name}</h3>
								<p className="text-sm text-[hsl(199,89%,49%)] mb-4">{member.role}</p>
								<p className="text-[hsl(216,33%,68%)] text-sm mb-6">{member.bio}</p>
								<div className="flex items-center justify-center gap-4">
									<a
										href={member.twitter}
										className="text-[hsl(216,33%,68%)] hover:text-[hsl(199,89%,49%)] transition-colors"
										aria-label="Twitter"
									>
										<Twitter className="w-5 h-5" />
									</a>
									<a
										href={member.github}
										className="text-[hsl(216,33%,68%)] hover:text-[hsl(199,89%,49%)] transition-colors"
										aria-label="GitHub"
									>
										<Github className="w-5 h-5" />
									</a>
									<a
										href={member.linkedin}
										className="text-[hsl(216,33%,68%)] hover:text-[hsl(199,89%,49%)] transition-colors"
										aria-label="LinkedIn"
									>
										<Linkedin className="w-5 h-5" />
									</a>
								</div>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA */}
			<section className="navy-blue-blog-section">
				<div className="container mx-auto px-4 max-w-[1140px]">
					<div className="navy-blue-blog-card p-12 rounded-3xl text-center relative overflow-hidden">
						<div className="relative z-10">
							<h2 className="headline headline-2 text-[hsl(199,69%,84%)] mb-4">
								Ready to Get Started?
							</h2>
							<p className="text-lg text-[hsl(216,33%,68%)] mb-8 max-w-xl mx-auto">
								Join thousands of creators who are already using BlogCMS to build amazing content experiences.
							</p>
							<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
								<Link
									to="/"
									className="navy-blue-blog-btn inline-flex items-center gap-2 px-8 py-4 rounded-full"
								>
									<span>Explore Blog</span>
									<ArrowRight className="w-4 h-4" />
								</Link>
								<a
									href="mailto:hello@blogcms.dev"
									className="inline-flex items-center gap-2 px-8 py-4 rounded-full border border-[hsl(216,33%,20%)] text-[hsl(199,69%,84%)] hover:border-[hsl(199,89%,49%)] transition-colors"
								>
									<Mail className="w-4 h-4" />
									<span>Contact Us</span>
								</a>
							</div>
						</div>
						<div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[#0ea5ea20] to-transparent rounded-full blur-3xl" />
						<div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-[#0bd1d120] to-transparent rounded-full blur-3xl" />
					</div>
				</div>
			</section>
		</div>
	);
}
