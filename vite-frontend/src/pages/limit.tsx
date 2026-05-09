import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import toast from "react-hot-toast";

import {
  createSpeedLimit,
  getSpeedLimitList,
  updateSpeedLimit,
  deleteSpeedLimit,
  getTunnelList,
} from "@/api";

interface SpeedLimitRule {
  id: number;
  name: string;
  speed: number;
  status: number;
  tunnelId: number;
  tunnelName: string;
  createdTime: string;
  updatedTime: string;
}

interface Tunnel {
  id: number;
  name: string;
}

interface SpeedLimitForm {
  id?: number;
  name: string;
  speed: number;
  tunnelId: number | null;
  tunnelName: string;
  status: number;
}

export default function LimitPage() {
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<SpeedLimitRule[]>([]);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);

  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<SpeedLimitRule | null>(null);

  // 表单状态
  const [form, setForm] = useState<SpeedLimitForm>({
    name: "",
    speed: 100,
    tunnelId: null,
    tunnelName: "",
    status: 1,
  });

  // 表单验证错误
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadData();
  }, []);

  // 加载所有数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [rulesRes, tunnelsRes] = await Promise.all([
        getSpeedLimitList(),
        getTunnelList(),
      ]);

      if (rulesRes.code === 0) {
        setRules(rulesRes.data || []);
      } else {
        toast.error(rulesRes.msg || "获取限速规则失败");
      }

      if (tunnelsRes.code === 0) {
        setTunnels(tunnelsRes.data || []);
      } else {
        console.warn("获取隧道列表失败:", tunnelsRes.msg);
      }
    } catch (error) {
      console.error("加载数据失败:", error);
      toast.error("加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!form.name.trim()) {
      newErrors.name = "请输入规则名称";
    } else if (form.name.length < 2 || form.name.length > 50) {
      newErrors.name = "规则名称长度应在2-50个字符之间";
    }

    if (!form.speed || form.speed < 1) {
      newErrors.speed = "请输入有效的速度限制（≥1 Mbps）";
    }

    if (!form.tunnelId) {
      newErrors.tunnelId = "请选择要绑定的隧道";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // 新增规则
  const handleAdd = () => {
    setIsEdit(false);
    setForm({
      name: "",
      speed: 100,
      tunnelId: null,
      tunnelName: "",
      status: 1,
    });
    setErrors({});
    setModalOpen(true);
  };

  // 编辑规则
  const handleEdit = (rule: SpeedLimitRule) => {
    setIsEdit(true);
    setForm({
      id: rule.id,
      name: rule.name,
      speed: rule.speed,
      tunnelId: rule.tunnelId,
      tunnelName: rule.tunnelName,
      status: rule.status,
    });
    setErrors({});
    setModalOpen(true);
  };

  // 显示删除确认
  const handleDelete = (rule: SpeedLimitRule) => {
    setRuleToDelete(rule);
    setDeleteModalOpen(true);
  };

  // 确认删除规则
  const confirmDelete = async () => {
    if (!ruleToDelete) return;

    setDeleteLoading(true);
    try {
      const res = await deleteSpeedLimit(ruleToDelete.id);

      if (res.code === 0) {
        toast.success("删除成功");
        setDeleteModalOpen(false);
        loadData();
      } else {
        toast.error(res.msg || "删除失败");
      }
    } catch (error) {
      console.error("删除失败:", error);
      toast.error("删除失败");
    } finally {
      setDeleteLoading(false);
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitLoading(true);
    try {
      let res;

      if (isEdit) {
        res = await updateSpeedLimit(form);
      } else {
        const { id, ...createData } = form;

        res = await createSpeedLimit(createData);
      }

      if (res.code === 0) {
        toast.success(isEdit ? "修改成功" : "创建成功");
        setModalOpen(false);
        loadData();
      } else {
        toast.error(res.msg || "操作失败");
      }
    } catch (error) {
      console.error("提交失败:", error);
      toast.error("操作失败");
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3">
          <Spinner size="sm" />
          <span className="text-[#6b6560] dark:text-[#8a8480]">
            正在加载...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div className="flex-1" />

        <Button size="sm" variant="flat" color="primary" onPress={handleAdd}>
          新增
        </Button>
      </div>

      {/* 统一卡片网格 */}
      {rules.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {rules.map((rule) => (
            <Card
              key={rule.id}
              className="rounded-2xl shadow-sm border border-[#e5e0d8] dark:border-[#2d2824]"
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start w-full">
                  <div>
                    <h3 className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                      {rule.name}
                    </h3>
                  </div>
                  <Chip
                    color={rule.status === 1 ? "success" : "danger"}
                    variant="flat"
                    size="sm"
                  >
                    {rule.status === 1 ? "运行" : "异常"}
                  </Chip>
                </div>
              </CardHeader>
              <CardBody className="pt-0 pb-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-small text-[#6b6560] dark:text-[#8a8480]">
                      速度限制
                    </span>
                    <Chip color="secondary" size="sm" variant="flat">
                      {rule.speed} Mbps
                    </Chip>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-small text-[#6b6560] dark:text-[#8a8480]">
                      绑定隧道
                    </span>
                    {rule.tunnelName ? (
                      <Chip color="primary" size="sm" variant="flat">
                        {rule.tunnelName}
                      </Chip>
                    ) : (
                      <span className="text-[#9b9590] dark:text-[#5d5854] text-small">
                        未绑定
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    className="flex-1"
                      color="primary"
                      size="sm"
                      startContent={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      }
                      variant="flat"
                      onPress={() => handleEdit(rule)}
                  >
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="danger"
                    onPress={() => handleDelete(rule)}
                    className="flex-1"
                    startContent={
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={1.8}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    }
                  >
                    删除
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        /* 空状态 */
        <Card className="rounded-2xl shadow-sm border border-[#e5e0d8] dark:border-[#2d2824]">
          <CardBody className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-[#f0ece6] dark:bg-[#2d2824] rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-[#9b9590] dark:text-[#5d5854]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 6v6l4 2m6-6a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                  暂无限速规则
                </h3>
                <p className="text-[#9b9590] dark:text-[#5d5854] text-sm mt-1">
                  还没有创建任何限速规则，点击上方按钮开始创建
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 新增/编辑模态框 */}
      <Modal
        isOpen={modalOpen}
        onOpenChange={setModalOpen}
        size="2xl"
        scrollBehavior="outside"
        backdrop="blur"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-xl font-bold">
                  {isEdit ? "编辑限速规则" : "新增限速规则"}
                </h2>
                <p className="text-small text-[#9b9590] dark:text-[#5d5854]">
                  {isEdit
                    ? "修改现有限速规则的配置信息"
                    : "创建新的限速规则并绑定到隧道"}
                </p>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <Input
                    errorMessage={errors.name}
                      isInvalid={!!errors.name}
                      label="规则名称"
                      placeholder="请输入限速规则名称"
                      value={form.name}
                      variant="bordered"
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  />

                  <Input
                    endContent={
                        <div className="pointer-events-none flex items-center">
                          <span className="text-[#9b9590] dark:text-[#5d5854] text-small">Mbps</span>
                        </div>
                      }
                      errorMessage={errors.speed}
                      isInvalid={!!errors.speed}
                      label="速度限制"
                      placeholder="请输入速度限制"
                      type="number"
                      value={form.speed.toString()}
                      variant="bordered"
                      onChange={(e) => setForm(prev => ({ ...prev, speed: parseInt(e.target.value) || 0 }))}
                    />

                  <Select
                    label="绑定隧道"
                    placeholder="请选择要绑定的隧道"
                    selectedKeys={
                      form.tunnelId ? [form.tunnelId.toString()] : []
                    }
                    onSelectionChange={(keys) => {
                      const selectedKey = Array.from(keys)[0] as string;

                      if (selectedKey) {
                        const selectedTunnel = tunnels.find(
                          (tunnel) => tunnel.id === parseInt(selectedKey),
                        );
                        setForm((prev) => ({
                          ...prev,
                          tunnelId: parseInt(selectedKey),
                          tunnelName: selectedTunnel?.name || "",
                        }));
                      } else {
                        setForm((prev) => ({
                          ...prev,
                          tunnelId: null,
                          tunnelName: "",
                        }));
                      }
                    }}
                    isInvalid={!!errors.tunnelId}
                    errorMessage={errors.tunnelId}
                    variant="bordered"
                  >
                    {tunnels.map((tunnel) => (
                      <SelectItem key={tunnel.id}>{tunnel.name}</SelectItem>
                    ))}
                  </Select>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  onPress={handleSubmit}
                  isLoading={submitLoading}
                >
                  {isEdit ? "保存修改" : "创建规则"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        size="2xl"
        scrollBehavior="outside"
        backdrop="blur"
        placement="center"
      >
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">
                <h2 className="text-lg font-bold text-danger">确认删除</h2>
              </ModalHeader>
              <ModalBody>
                <p className="text-[#6b6560] dark:text-[#8a8480]">
                  确定要删除限速规则{" "}
                  <span className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">
                    "{ruleToDelete?.name}"
                  </span>{" "}
                  吗？
                </p>
                <p className="text-small text-[#9b9590] dark:text-[#5d5854] mt-2">
                  此操作无法撤销，删除后该规则将永久消失。
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="danger"
                  onPress={confirmDelete}
                  isLoading={deleteLoading}
                >
                  确认删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
