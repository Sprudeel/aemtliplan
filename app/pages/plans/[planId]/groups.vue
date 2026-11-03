<script setup lang="ts">
import type { GroupDto, MemberDto } from "~~/shared/types/api";

const { t } = useI18n();
useSeoMeta({ title: () => t("nav.groups") });
const { plan, isAdmin } = usePlan();
const api = usePlanApiBase();
const notify = useNotify();
const { data: groups, refresh, status } = usePlanGroups();
const { data: assignments } = usePlanAssignments();
const { data: jobs } = usePlanJobs();

const search = ref("");
const filtered = computed(() => {
  const term = search.value.trim().toLowerCase();
  if (!term) return groups.value;
  return groups.value.filter((group) =>
    [group.name, ...group.members.map((member) => member.name)].some((value) => value.toLowerCase().includes(term)),
  );
});

/** Ämtli each group currently does. */
const jobsByGroup = computed(() => {
  const names = new Map(jobs.value.map((job) => [job.id, job.name]));
  const result = new Map<number, string[]>();
  for (const entry of assignments.value) {
    if (!entry.group) continue;
    result.set(entry.group.id, [...(result.get(entry.group.id) ?? []), names.get(entry.jobId) ?? ""]);
  }
  return result;
});

const formOpen = ref(false);
const editing = ref<GroupDto | null>(null);
function openCreate() {
  editing.value = null;
  formOpen.value = true;
}
function openEdit(group: GroupDto) {
  editing.value = group;
  formOpen.value = true;
}
async function onSaved() {
  await refreshNuxtData();
}

const deleteOpen = ref(false);
const deleting = ref<GroupDto | null>(null);
const deleteBusy = ref(false);
async function confirmDelete() {
  if (!deleting.value) return;
  deleteBusy.value = true;
  const ok = await notify.run(() => plainFetch(`${api.value}/groups/${deleting.value!.id}`, { method: "DELETE" }), "groups.deleted");
  deleteBusy.value = false;
  if (ok) {
    deleteOpen.value = false;
    await refreshNuxtData();
  }
}

async function toggleRotation(group: GroupDto) {
  const ok = await notify.run(
    () => plainFetch(`${api.value}/groups/${group.id}`, { method: "PATCH", body: { inRotation: !group.inRotation } }),
    group.inRotation ? "groups.pausedToast" : "groups.resumedToast",
    { name: group.name },
  );
  if (ok) await refreshNuxtData();
}

const inviteOpen = ref(false);
const inviteGroup = ref<GroupDto | null>(null);
const inviteMember = ref<MemberDto | null>(null);
function openInvite(group: GroupDto, member: MemberDto) {
  inviteGroup.value = group;
  inviteMember.value = member;
  inviteOpen.value = true;
}
</script>

<template>
  <UDashboardPanel id="groups">
    <template #header>
      <UDashboardNavbar :title="t('nav.groups')">
        <template #leading>
          <UDashboardSidebarCollapse />
        </template>
        <template #right>
          <UButton v-if="isAdmin" :label="t('groups.create')" icon="i-lucide-plus" data-testid="add-group" @click="openCreate" />
        </template>
      </UDashboardNavbar>
    </template>

    <template #body>
      <UInput v-model="search" icon="i-lucide-search" :placeholder="t('groups.search')" class="max-w-sm" />

      <UEmpty
        v-if="status !== 'pending' && groups.length === 0"
        icon="i-lucide-users"
        :title="t('groups.emptyTitle')"
        :description="t('groups.emptyText')"
      />

      <UPageGrid v-else class="sm:grid-cols-2 xl:grid-cols-3" data-testid="group-list">
        <UPageCard v-for="group in filtered" :key="group.id" variant="subtle" :ui="{ container: 'gap-y-3' }">
          <div class="flex items-start justify-between gap-2">
            <div class="space-y-1">
              <GroupChip :group="group" />
              <p class="text-xs text-muted">
                <template v-if="!group.inRotation">{{ t("groups.paused") }}</template>
                <template v-else-if="jobsByGroup.get(group.id)?.length">{{ jobsByGroup.get(group.id)!.join(", ") }}</template>
                <template v-else>{{ t("groups.idle") }}</template>
              </p>
            </div>
            <UDropdownMenu
              v-if="isAdmin"
              :items="[
                { label: t('actions.edit'), icon: 'i-lucide-pencil', onSelect: () => openEdit(group) },
                { label: group.inRotation ? t('groups.pause') : t('groups.resume'), icon: group.inRotation ? 'i-lucide-pause' : 'i-lucide-play', onSelect: () => toggleRotation(group) },
                { type: 'separator' },
                { label: t('actions.delete'), icon: 'i-lucide-trash', color: 'error', onSelect: () => { deleting = group; deleteOpen = true } },
              ]"
              :content="{ align: 'end' }"
            >
              <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="ghost" :aria-label="t('actions.more')" />
            </UDropdownMenu>
          </div>

          <ul class="flex flex-wrap gap-1.5">
            <li v-for="member in group.members" :key="member.id">
              <UBadge color="neutral" variant="outline" class="gap-1">
                {{ member.name }}
                <UIcon v-if="member.hasLogin" name="i-lucide-user-check" class="size-3.5 text-success" :title="t('groups.hasLogin')" />
                <UIcon v-else-if="member.invited" name="i-lucide-mail" class="size-3.5 text-warning" :title="t('groups.invitedHint')" />
                <UButton
                  v-else-if="isAdmin && plan?.settings.memberLogin"
                  icon="i-lucide-user-plus"
                  size="xs"
                  color="neutral"
                  variant="link"
                  class="p-0"
                  :aria-label="t('groups.invite')"
                  @click="openInvite(group, member)"
                />
              </UBadge>
            </li>
          </ul>
        </UPageCard>
      </UPageGrid>

      <GroupsGroupFormModal v-model:open="formOpen" :group="editing" @saved="onSaved" />
      <GroupsInviteMemberModal v-model:open="inviteOpen" :group="inviteGroup" :member="inviteMember" @invited="refresh()" />
      <ConfirmModal
        v-model:open="deleteOpen"
        :title="t('groups.deleteTitle')"
        :description="t('groups.deleteText', { name: deleting?.name })"
        :loading="deleteBusy"
        @confirm="confirmDelete"
      />
    </template>
  </UDashboardPanel>
</template>
