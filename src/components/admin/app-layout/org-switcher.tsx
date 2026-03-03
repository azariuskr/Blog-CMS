// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { useNavigate } from "@tanstack/react-router";
// import { Building, Check, ChevronsUpDown, Plus } from "lucide-react";
// import * as React from "react";
// import { toast } from "sonner";

// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import {
//   SidebarMenu,
//   SidebarMenuButton,
//   SidebarMenuItem,
//   useSidebar,
// } from "@/components/ui/sidebar";
// import {
//   Dialog,
//   DialogContent,
//   DialogDescription,
//   DialogFooter,
//   DialogHeader,
//   DialogTitle,
// } from "@/components/ui/dialog";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { organization, useActiveOrganization, useListOrganizations } from "@/lib/auth/auth-client";

// export function OrgSwitcher() {
//   const { isMobile } = useSidebar();
//   const navigate = useNavigate();
//   const queryClient = useQueryClient();
//   const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
//   const [newOrgName, setNewOrgName] = React.useState("");

//   const { data: activeOrg, isPending: activeOrgPending } = useActiveOrganization();
//   const { data: orgsData, isPending: orgsPending } = useListOrganizations();

//   const organizations = orgsData ?? [];

//   const switchMutation = useMutation({
//     mutationFn: async (orgId: string) => {
//       const result = await organization.setActive({ organizationId: orgId });
//       if (result.error) throw new Error(result.error.message || "Failed to switch organization");
//       return result.data;
//     },
//     onSuccess: () => {
//       toast.success("Organization switched");
//       queryClient.invalidateQueries({ queryKey: ["admin"] });
//     },
//     onError: (error: any) => toast.error(error?.message || "Failed to switch organization"),
//   });

//   const createMutation = useMutation({
//     mutationFn: async () => {
//       if (!newOrgName.trim()) throw new Error("Organization name is required");
//       const slug = newOrgName
//         .toLowerCase()
//         .replace(/[^a-z0-9]+/g, "-")
//         .replace(/^-+|-+$/g, "");
//       const result = await organization.create({ name: newOrgName.trim(), slug });
//       if (result.error) throw new Error(result.error.message || "Failed to create organization");
//       return result.data;
//     },
//     onSuccess: () => {
//       toast.success("Organization created");
//       setCreateDialogOpen(false);
//       setNewOrgName("");
//       queryClient.invalidateQueries({ queryKey: ["organizations"] });
//     },
//     onError: (error: any) => toast.error(error?.message || "Failed to create organization"),
//   });

//   const handleSwitch = (orgId: string) => {
//     if (orgId !== activeOrg?.id) {
//       switchMutation.mutate(orgId);
//     }
//   };

//   const isLoading = activeOrgPending || orgsPending;

//   return (
//     <>
//       <SidebarMenu>
//         <SidebarMenuItem>
//           <DropdownMenu>
//             <DropdownMenuTrigger
//               render={(props) => (
//                 <SidebarMenuButton
//                   {...props}
//                   size="lg"
//                   className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
//                 >
//                   <div className="bg-muted flex aspect-square size-8 items-center justify-center rounded-lg">
//                     <Building className="size-4" />
//                   </div>
//                   <div className="grid flex-1 text-left text-sm leading-tight">
//                     <span className="truncate font-semibold">
//                       {isLoading ? "Loading..." : activeOrg?.name || "No Organization"}
//                     </span>
//                     <span className="truncate text-xs text-muted-foreground">
//                       {organizations.length} organization{organizations.length !== 1 ? "s" : ""}
//                     </span>
//                   </div>
//                   <ChevronsUpDown className="ml-auto size-4" />
//                 </SidebarMenuButton>
//               )}
//             />
//             <DropdownMenuContent
//               className="w-56 min-w-56 rounded-lg"
//               side={isMobile ? "bottom" : "right"}
//               align="start"
//               sideOffset={4}
//             >
//               <DropdownMenuLabel className="text-xs text-muted-foreground">
//                 Organizations
//               </DropdownMenuLabel>
//               {organizations.length === 0 ? (
//                 <div className="px-2 py-4 text-center text-sm text-muted-foreground">
//                   No organizations yet
//                 </div>
//               ) : (
//                 organizations.map((org) => (
//                   <DropdownMenuItem
//                     key={org.id}
//                     onClick={() => handleSwitch(org.id)}
//                     className="gap-2"
//                   >
//                     <div className="flex size-6 items-center justify-center rounded-sm border">
//                       <Building className="size-4 shrink-0" />
//                     </div>
//                     <span className="flex-1 truncate">{org.name}</span>
//                     {activeOrg?.id === org.id && <Check className="size-4" />}
//                   </DropdownMenuItem>
//                 ))
//               )}
//               <DropdownMenuSeparator />
//               <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
//                 <Plus className="mr-2 size-4" />
//                 Create Organization
//               </DropdownMenuItem>
//               <DropdownMenuItem onClick={() => navigate({ to: "/organization/members" } as any)}>
//                 <Building className="mr-2 size-4" />
//                 Manage Organizations
//               </DropdownMenuItem>
//             </DropdownMenuContent>
//           </DropdownMenu>
//         </SidebarMenuItem>
//       </SidebarMenu>

//       <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
//         <DialogContent className="sm:max-w-md">
//           <DialogHeader>
//             <DialogTitle>Create Organization</DialogTitle>
//             <DialogDescription>
//               Create a new organization to collaborate with your team.
//             </DialogDescription>
//           </DialogHeader>
//           <div className="space-y-4 py-4">
//             <div className="space-y-2">
//               <Label htmlFor="org-name">Organization Name</Label>
//               <Input
//                 id="org-name"
//                 placeholder="My Organization"
//                 value={newOrgName}
//                 onChange={(e) => setNewOrgName(e.target.value)}
//                 onKeyDown={(e) => {
//                   if (e.key === "Enter" && newOrgName.trim()) {
//                     createMutation.mutate();
//                   }
//                 }}
//               />
//             </div>
//           </div>
//           <DialogFooter>
//             <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
//               Cancel
//             </Button>
//             <Button
//               onClick={() => createMutation.mutate()}
//               disabled={createMutation.isPending || !newOrgName.trim()}
//             >
//               {createMutation.isPending ? "Creating..." : "Create"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>
//     </>
//   );
// }
