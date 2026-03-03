import { useNavigate } from "@tanstack/react-router";
import {
	ReactFlow,
	Background,
	Controls,
	MiniMap,
	Panel,
	useNodesState,
	useEdgesState,
	addEdge,
	type Node,
	type Edge,
	type OnConnect,
	type NodeTypes,
	Handle,
	Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
	ArrowLeft,
	Calendar,
	Clock,
	Filter,
	Mail,
	Play,
	Save,
	Users,
	Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageContainer } from "@/components/admin/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ROUTES } from "@/constants";
import { useUpdateCampaign } from "@/hooks/ecommerce-actions";
import { useAdminCampaign, useAdminTemplateList } from "@/lib/ecommerce/queries";

// =============================================================================
// Custom Node Components
// =============================================================================

function TriggerNode({ data }: { data: any }) {
	return (
		<div className="rounded-lg border-2 border-emerald-500 bg-emerald-50 px-4 py-3 shadow-md dark:bg-emerald-950">
			<div className="flex items-center gap-2">
				<Zap className="h-4 w-4 text-emerald-600" />
				<span className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
					Trigger
				</span>
			</div>
			<p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
				{data.label || "Campaign Start"}
			</p>
			<Handle type="source" position={Position.Bottom} className="!bg-emerald-500" />
		</div>
	);
}

function AudienceNode({ data }: { data: any }) {
	return (
		<div className="rounded-lg border-2 border-blue-500 bg-blue-50 px-4 py-3 shadow-md dark:bg-blue-950">
			<Handle type="target" position={Position.Top} className="!bg-blue-500" />
			<div className="flex items-center gap-2">
				<Users className="h-4 w-4 text-blue-600" />
				<span className="text-sm font-semibold text-blue-800 dark:text-blue-200">
					Audience
				</span>
			</div>
			<p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
				{data.label || "All Customers"}
			</p>
			<Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
		</div>
	);
}

function EmailNode({ data }: { data: any }) {
	return (
		<div className="rounded-lg border-2 border-rose-500 bg-rose-50 px-4 py-3 shadow-md dark:bg-rose-950">
			<Handle type="target" position={Position.Top} className="!bg-rose-500" />
			<div className="flex items-center gap-2">
				<Mail className="h-4 w-4 text-rose-600" />
				<span className="text-sm font-semibold text-rose-800 dark:text-rose-200">
					Send Email
				</span>
			</div>
			<p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
				{data.label || "Select template"}
			</p>
			<Handle type="source" position={Position.Bottom} className="!bg-rose-500" />
		</div>
	);
}

function DelayNode({ data }: { data: any }) {
	return (
		<div className="rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 shadow-md dark:bg-amber-950">
			<Handle type="target" position={Position.Top} className="!bg-amber-500" />
			<div className="flex items-center gap-2">
				<Clock className="h-4 w-4 text-amber-600" />
				<span className="text-sm font-semibold text-amber-800 dark:text-amber-200">
					Wait
				</span>
			</div>
			<p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
				{data.label || "1 day"}
			</p>
			<Handle type="source" position={Position.Bottom} className="!bg-amber-500" />
		</div>
	);
}

function ConditionNode({ data }: { data: any }) {
	return (
		<div className="rounded-lg border-2 border-purple-500 bg-purple-50 px-4 py-3 shadow-md dark:bg-purple-950">
			<Handle type="target" position={Position.Top} className="!bg-purple-500" />
			<div className="flex items-center gap-2">
				<Filter className="h-4 w-4 text-purple-600" />
				<span className="text-sm font-semibold text-purple-800 dark:text-purple-200">
					Condition
				</span>
			</div>
			<p className="mt-1 text-xs text-purple-600 dark:text-purple-400">
				{data.label || "If/Then"}
			</p>
			<Handle type="source" position={Position.Bottom} id="yes" className="!bg-purple-500 !left-[30%]" />
			<Handle type="source" position={Position.Bottom} id="no" className="!bg-purple-500 !left-[70%]" />
		</div>
	);
}

const nodeTypes: NodeTypes = {
	trigger: TriggerNode,
	audience: AudienceNode,
	email: EmailNode,
	delay: DelayNode,
	condition: ConditionNode,
};

const DEFAULT_NODES: Node[] = [
	{
		id: "trigger-1",
		type: "trigger",
		position: { x: 250, y: 0 },
		data: { label: "Campaign Start" },
	},
	{
		id: "audience-1",
		type: "audience",
		position: { x: 250, y: 120 },
		data: { label: "All Customers" },
	},
	{
		id: "email-1",
		type: "email",
		position: { x: 250, y: 240 },
		data: { label: "Welcome Email" },
	},
];

const DEFAULT_EDGES: Edge[] = [
	{ id: "e-trigger-audience", source: "trigger-1", target: "audience-1", animated: true },
	{ id: "e-audience-email", source: "audience-1", target: "email-1", animated: true },
];

// =============================================================================
// Main Editor
// =============================================================================

interface CampaignEditorViewProps {
	campaignId: string;
}

const STATUS_COLORS: Record<string, string> = {
	draft: "secondary",
	scheduled: "outline",
	running: "default",
	completed: "secondary",
	paused: "destructive",
};

export function CampaignEditorView({ campaignId }: CampaignEditorViewProps) {
	const navigate = useNavigate();
	const isNew = campaignId === "new";

	const { data: campaignData, isLoading } = useAdminCampaign(
		isNew ? "" : campaignId,
	);
	const campaign = campaignData?.ok ? (campaignData.data as any) : null;

	const { data: templateListData } = useAdminTemplateList();
	const templates = templateListData?.ok ? (templateListData.data as any[]) : [];

	const updateMutation = useUpdateCampaign();

	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [templateId, setTemplateId] = useState("");
	const [initialized, setInitialized] = useState(false);

	const [nodes, setNodes, onNodesChange] = useNodesState(DEFAULT_NODES);
	const [edges, setEdges, onEdgesChange] = useEdgesState(DEFAULT_EDGES);

	// Populate form from campaign data
	useEffect(() => {
		if (campaign && !initialized) {
			setName(campaign.name ?? "");
			setDescription(campaign.description ?? "");
			setTemplateId(campaign.templateId ?? "");

			const flow = campaign.flowDefinition;
			if (flow?.nodes?.length > 0) {
				setNodes(flow.nodes);
				setEdges(flow.edges ?? []);
			}

			setInitialized(true);
		}
	}, [campaign, initialized, setNodes, setEdges]);

	const onConnect: OnConnect = useCallback(
		(connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
		[setEdges],
	);

	const handleSave = () => {
		if (!campaignId || isNew) return;

		updateMutation.mutate({
			id: campaignId,
			name,
			description: description || undefined,
			templateId: templateId || undefined,
			flowDefinition: { nodes, edges },
		});
	};

	const addNode = (type: string) => {
		const id = `${type}-${Date.now()}`;
		const labels: Record<string, string> = {
			email: "Send Email",
			delay: "Wait 1 day",
			condition: "Check condition",
			audience: "Filter audience",
		};

		const newNode: Node = {
			id,
			type,
			position: { x: 250, y: (nodes.length + 1) * 120 },
			data: { label: labels[type] ?? type },
		};

		setNodes((nds) => [...nds, newNode]);
	};

	const isSaving = updateMutation.isPending;

	return (
		<PageContainer
			title={isNew ? "New Campaign" : name || "Edit Campaign"}
			description="Design your email campaign flow"
			actions={
				<div className="flex items-center gap-2">
					{campaign && (
						<Badge variant={STATUS_COLORS[campaign.status] as any}>
							{campaign.status}
						</Badge>
					)}
					<Button
						variant="outline"
						onClick={() => navigate({ to: ROUTES.ADMIN.CAMPAIGNS })}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back
					</Button>
					{!isNew && (
						<Button onClick={handleSave} disabled={isSaving}>
							<Save className="mr-2 h-4 w-4" />
							{isSaving ? "Saving..." : "Save"}
						</Button>
					)}
				</div>
			}
		>
			<div className="grid gap-6 lg:grid-cols-[1fr_320px]">
				{/* Flow Canvas */}
				<Card className="overflow-hidden">
					<CardContent className="p-0">
						<div style={{ height: 500 }}>
							<ReactFlow
								nodes={nodes}
								edges={edges}
								onNodesChange={onNodesChange}
								onEdgesChange={onEdgesChange}
								onConnect={onConnect}
								nodeTypes={nodeTypes}
								fitView
								proOptions={{ hideAttribution: true }}
							>
								<Background />
								<Controls />
								<MiniMap
									nodeStrokeWidth={3}
									zoomable
									pannable
								/>
								<Panel position="top-left">
									<div className="flex gap-1 rounded-lg border bg-background p-1 shadow-sm">
										<Button
											variant="ghost"
											size="sm"
											onClick={() => addNode("email")}
											title="Add Email"
										>
											<Mail className="h-4 w-4 text-rose-500" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => addNode("delay")}
											title="Add Delay"
										>
											<Clock className="h-4 w-4 text-amber-500" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => addNode("condition")}
											title="Add Condition"
										>
											<Filter className="h-4 w-4 text-purple-500" />
										</Button>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => addNode("audience")}
											title="Add Audience Filter"
										>
											<Users className="h-4 w-4 text-blue-500" />
										</Button>
									</div>
								</Panel>
							</ReactFlow>
						</div>
					</CardContent>
				</Card>

				{/* Settings Sidebar */}
				<div className="space-y-4">
					{/* Campaign Details */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Campaign Details</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="space-y-1.5">
								<Label className="text-xs">Name</Label>
								<Input
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Campaign name"
								/>
							</div>
							<div className="space-y-1.5">
								<Label className="text-xs">Description</Label>
								<Textarea
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Brief description"
									rows={2}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Template Selection */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Email Template</CardTitle>
						</CardHeader>
						<CardContent>
							<Select
								value={templateId}
								onValueChange={(v) => setTemplateId(v === "none" ? "" : v)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select template" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No template</SelectItem>
									{templates.map((t: any) => (
										<SelectItem key={t.id} value={t.id}>
											{t.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</CardContent>
					</Card>

					{/* Flow Legend */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Node Types</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="flex items-center gap-2 text-xs">
								<div className="h-3 w-3 rounded-sm bg-emerald-500" />
								<span>Trigger - Campaign start point</span>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<div className="h-3 w-3 rounded-sm bg-blue-500" />
								<span>Audience - Filter recipients</span>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<div className="h-3 w-3 rounded-sm bg-rose-500" />
								<span>Email - Send an email</span>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<div className="h-3 w-3 rounded-sm bg-amber-500" />
								<span>Wait - Add a time delay</span>
							</div>
							<div className="flex items-center gap-2 text-xs">
								<div className="h-3 w-3 rounded-sm bg-purple-500" />
								<span>Condition - Branch logic</span>
							</div>
						</CardContent>
					</Card>

					{/* Stats (for non-draft campaigns) */}
					{campaign && campaign.status !== "draft" && (
						<Card>
							<CardHeader>
								<CardTitle className="text-sm">Statistics</CardTitle>
							</CardHeader>
							<CardContent className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Recipients</span>
									<span className="font-medium">{campaign.totalRecipients}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Sent</span>
									<span className="font-medium">{campaign.sentCount}</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Failed</span>
									<span className="font-medium">{campaign.failedCount}</span>
								</div>
							</CardContent>
						</Card>
					)}
				</div>
			</div>
		</PageContainer>
	);
}
