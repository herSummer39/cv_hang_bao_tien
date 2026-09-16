"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Types ────────────────────────────────────────────────────────────────────
interface Industry {
  id: string;
  name: string;
  slug: string;
  sort_order: number | null;
}

interface IndustrySelectProps {
  /** UUID của industry đang được chọn, hoặc null = "để hệ thống tự đoán" */
  value: string | null;
  /** Callback khi thay đổi, truyền null nếu user chọn "tự đoán" */
  onChange: (id: string | null) => void;
  /** Lớp CSS bổ sung cho wrapper */
  className?: string;
}

// ── Module-level cache (load 1 lần trong session) ────────────────────────────
let _groupsCache: Industry[] | null = null;
let _branchesCache: Record<string, Industry[]> = {};

// ── Component ─────────────────────────────────────────────────────────────────
export default function IndustrySelect({
  value,
  onChange,
  className = "",
}: IndustrySelectProps) {
  const supabase = useRef(createClient()).current;

  const [groups, setGroups] = useState<Industry[]>(_groupsCache ?? []);
  const [branches, setBranches] = useState<Industry[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [loading, setLoading] = useState(!_groupsCache);

  // ── Khởi tạo: đồng bộ từ prop `value` về group/branch đã chọn ────────────
  // (Chạy khi groups load xong + value đổi)
  useEffect(() => {
    if (!groups.length || !value) return;

    // Kiểm tra xem value là group hay branch
    const isGroup = groups.some((g) => g.id === value);
    if (isGroup) {
      setSelectedGroupId(value);
      setSelectedBranchId("");
    } else {
      // Tìm group cha của branch này trong cache
      for (const [gId, brs] of Object.entries(_branchesCache)) {
        if (brs.some((b) => b.id === value)) {
          setSelectedGroupId(gId);
          setSelectedBranchId(value);
          setBranches(brs);
          return;
        }
      }
      // Branch chưa trong cache — load branches của group hiện tại để tìm
      // (prefill case: user có preferred_industry_id là branch)
      (async () => {
        const { data } = await supabase
          .from("industries")
          .select("id, name, slug, sort_order, parent_id")
          .eq("id", value)
          .single();
        if (data?.parent_id) {
          setSelectedGroupId(data.parent_id);
          await loadBranches(data.parent_id);
          setSelectedBranchId(value);
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, value]);

  // ── Load nhóm lớn ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (_groupsCache) {
      setGroups(_groupsCache);
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("industries")
        .select("id, name, slug, sort_order")
        .eq("level", "group")
        .order("sort_order", { ascending: true });
      if (data) {
        _groupsCache = data as Industry[];
        setGroups(_groupsCache);
      }
      setLoading(false);
    })();
  }, [supabase]);

  // ── Load nhánh nhỏ theo group ─────────────────────────────────────────────
  async function loadBranches(groupId: string) {
    if (_branchesCache[groupId]) {
      setBranches(_branchesCache[groupId]);
      return;
    }
    const { data } = await supabase
      .from("industries")
      .select("id, name, slug, sort_order")
      .eq("level", "branch")
      .eq("parent_id", groupId)
      .order("sort_order", { ascending: true });
    if (data) {
      _branchesCache[groupId] = data as Industry[];
      setBranches(_branchesCache[groupId]);
    }
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleGroupChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const gId = e.target.value;
    setSelectedGroupId(gId);
    setSelectedBranchId("");
    setBranches([]);

    if (!gId) {
      // "Không chắc / tự đoán"
      onChange(null);
      return;
    }
    // Mặc định: chọn ngay group_id (không cần bắt buộc chọn nhánh)
    onChange(gId);
    loadBranches(gId);
  }

  function handleBranchChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const bId = e.target.value;
    setSelectedBranchId(bId);
    if (bId) {
      onChange(bId);
    } else {
      // Bỏ chọn nhánh → fallback về group
      onChange(selectedGroupId || null);
    }
  }

  // ── Label hiển thị kết quả đã chọn ────────────────────────────────────────
  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.name;
  const selectedBranchName = branches.find((b) => b.id === selectedBranchId)?.name;

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="block text-[11px] font-semibold text-[#565e74] uppercase tracking-wider">
          Ngành nghề
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#004f35] bg-[#85f8c4]/30 px-2 py-0.5 rounded-full">
            <span className="material-symbols-outlined text-[12px]">check_circle</span>
            {selectedBranchName ?? selectedGroupName}
          </span>
        )}
        {!value && (
          <span className="text-[11px] text-[#747686]">
            Tự động nhận diện từ JD
          </span>
        )}
      </div>

      {/* Nhóm lớn */}
      <div className="relative">
        <span className="material-symbols-outlined text-[#747686] text-[18px] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
          domain
        </span>
        <select
          id="industry-group"
          disabled={loading}
          value={selectedGroupId}
          onChange={handleGroupChange}
          className="w-full bg-[#eff4ff] rounded-xl pl-9 pr-8 py-2 text-[14px] text-[#0b1c30] focus:outline-none focus:bg-[#e5eeff] transition-all appearance-none cursor-pointer disabled:opacity-60"
        >
          <option value="">
            {loading ? "Đang tải ngành nghề..." : "✦ Không chắc / để hệ thống tự đoán"}
          </option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <span className="material-symbols-outlined text-[#747686] text-[16px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          expand_more
        </span>
      </div>

      {/* Nhánh nhỏ — chỉ hiện khi đã chọn nhóm lớn */}
      {selectedGroupId && (
        <div className="relative pl-4 border-l-2 border-[#e5eeff]">
          <span className="material-symbols-outlined text-[#a0aabe] text-[16px] absolute left-6 top-1/2 -translate-y-1/2 pointer-events-none">
            subdirectory_arrow_right
          </span>
          <select
            id="industry-branch"
            value={selectedBranchId}
            onChange={handleBranchChange}
            className="w-full bg-[#f5f7ff] rounded-xl pl-9 pr-8 py-2 text-[13px] text-[#0b1c30] focus:outline-none focus:bg-[#e5eeff] transition-all appearance-none cursor-pointer"
          >
            <option value="">— Chỉ chọn nhóm lớn (không bắt buộc) —</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined text-[#a0aabe] text-[16px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            expand_more
          </span>
        </div>
      )}

      {/* Hint */}
      {!selectedGroupId && !loading && (
        <p className="text-[11px] text-[#747686] leading-relaxed">
          <span className="material-symbols-outlined text-[12px] align-middle mr-0.5">info</span>
          Chọn ngành để AI dùng đúng bộ kỹ năng khi đối chiếu. Bỏ trống = hệ thống tự nhận diện từ nội dung JD.
        </p>
      )}
    </div>
  );
}
