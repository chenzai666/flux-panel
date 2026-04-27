import { useState, useEffect } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Select, SelectItem } from "@heroui/select";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Spinner } from "@heroui/spinner";
import { Divider } from "@heroui/divider";
import { Alert } from "@heroui/alert";
import toast from 'react-hot-toast';


import { 
  createTunnel, 
  getTunnelList, 
  updateTunnel, 
  deleteTunnel,
  getNodeList,
  diagnoseTunnel
} from "@/api";

interface Tunnel {
  id: number;
  name: string;
  type: number; // 1: 端口转发, 2: 隧道转发
  inNodeId: number;
  outNodeId?: number;
  inIp: string;
  outIp?: string;
  protocol?: string;
  tcpListenAddr: string;
  udpListenAddr: string;
  interfaceName?: string;
  flow: number; // 1: 单向, 2: 双向
  trafficRatio: number;
  status: number;
  createdTime: string;
}

interface Node {
  id: number;
  name: string;
  status: number; // 1: 在线, 0: 离线
}

interface TunnelForm {
  id?: number;
  name: string;
  type: number;
  inNodeId: number | null;
  outNodeId?: number | null;
  protocol: string;
  tcpListenAddr: string;
  udpListenAddr: string;
  interfaceName?: string;
  flow: number;
  trafficRatio: number;
  status: number;
}

interface DiagnosisResult {
  tunnelName: string;
  tunnelType: string;
  timestamp: number;
  results: Array<{
    success: boolean;
    description: string;
    nodeName: string;
    nodeId: string;
    targetIp: string;
    targetPort?: number;
    message?: string;
    averageTime?: number;
    packetLoss?: number;
  }>;
}

export default function TunnelPage() {
  const [loading, setLoading] = useState(true);
  const [tunnels, setTunnels] = useState<Tunnel[]>([]);
  const [nodes, setNodes] = useState<Node[]>([]);
  
  // 模态框状态
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [diagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [diagnosisLoading, setDiagnosisLoading] = useState(false);
  const [tunnelToDelete, setTunnelToDelete] = useState<Tunnel | null>(null);
  const [currentDiagnosisTunnel, setCurrentDiagnosisTunnel] = useState<Tunnel | null>(null);
  const [diagnosisResult, setDiagnosisResult] = useState<DiagnosisResult | null>(null);
  
  // 表单状态
  const [form, setForm] = useState<TunnelForm>({
    name: '',
    type: 1,
    inNodeId: null,
    outNodeId: null,
    protocol: 'tls',
    tcpListenAddr: '[::]',
    udpListenAddr: '[::]',
    interfaceName: '',
    flow: 1,
    trafficRatio: 1.0,
    status: 1
  });
  
  // 表单验证错误
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadData();
  }, []);

  // 加载所有数据
  const loadData = async () => {
    setLoading(true);
    try {
      const [tunnelsRes, nodesRes] = await Promise.all([
        getTunnelList(),
        getNodeList()
      ]);
      
      if (tunnelsRes.code === 0) {
        setTunnels(tunnelsRes.data || []);
      } else {
        toast.error(tunnelsRes.msg || '获取隧道列表失败');
      }
      
      if (nodesRes.code === 0) {
        setNodes(nodesRes.data || []);
      } else {
        console.warn('获取节点列表失败:', nodesRes.msg);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      toast.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    if (!form.name.trim()) {
      newErrors.name = '请输入隧道名称';
    } else if (form.name.length < 2 || form.name.length > 50) {
      newErrors.name = '隧道名称长度应在2-50个字符之间';
    }
    
    if (!form.inNodeId) {
      newErrors.inNodeId = '请选择入口节点';
    }
    
    if (!form.tcpListenAddr.trim()) {
      newErrors.tcpListenAddr = '请输入TCP监听地址';
    }
    
    if (!form.udpListenAddr.trim()) {
      newErrors.udpListenAddr = '请输入UDP监听地址';
    }
    
    if (form.trafficRatio < 0.0 || form.trafficRatio > 100.0) {
      newErrors.trafficRatio = '流量倍率必须在0.0-100.0之间';
    }
    
    // 隧道转发时的验证
    if (form.type === 2) {
      if (!form.outNodeId) {
        newErrors.outNodeId = '请选择出口节点';
      } else if (form.inNodeId === form.outNodeId) {
        newErrors.outNodeId = '隧道转发模式下，入口和出口不能是同一个节点';
      }
      
      if (!form.protocol) {
        newErrors.protocol = '请选择协议类型';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 新增隧道
  const handleAdd = () => {
    setIsEdit(false);
    setForm({
      name: '',
      type: 1,
      inNodeId: null,
      outNodeId: null,
      protocol: 'tls',
      tcpListenAddr: '[::]',
      udpListenAddr: '[::]',
      interfaceName: '',
      flow: 1,
      trafficRatio: 1.0,
      status: 1
    });
    setErrors({});
    setModalOpen(true);
  };

  // 编辑隧道 - 只能修改部分字段
  const handleEdit = (tunnel: Tunnel) => {
    setIsEdit(true);
    setForm({
      id: tunnel.id,
      name: tunnel.name,
      type: tunnel.type,
      inNodeId: tunnel.inNodeId,
      outNodeId: tunnel.outNodeId || null,
      protocol: tunnel.protocol || 'tls',
      tcpListenAddr: tunnel.tcpListenAddr || '[::]',
      udpListenAddr: tunnel.udpListenAddr || '[::]',
      interfaceName: tunnel.interfaceName || '',
      flow: tunnel.flow,
      trafficRatio: tunnel.trafficRatio,
      status: tunnel.status
    });
    setErrors({});
    setModalOpen(true);
  };

  // 删除隧道
  const handleDelete = (tunnel: Tunnel) => {
    setTunnelToDelete(tunnel);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!tunnelToDelete) return;
    
    setDeleteLoading(true);
    try {
      const response = await deleteTunnel(tunnelToDelete.id);
      if (response.code === 0) {
        toast.success('删除成功');
        setDeleteModalOpen(false);
        setTunnelToDelete(null);
        loadData();
      } else {
        toast.error(response.msg || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast.error('删除失败');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 隧道类型改变时的处理
  const handleTypeChange = (type: number) => {
    setForm(prev => ({
      ...prev,
      type,
      outNodeId: type === 1 ? null : prev.outNodeId,
      protocol: type === 1 ? 'tls' : prev.protocol
    }));
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitLoading(true);
    try {
      const data = { ...form };
      
      const response = isEdit 
        ? await updateTunnel(data)
        : await createTunnel(data);
        
      if (response.code === 0) {
        toast.success(isEdit ? '更新成功' : '创建成功');
        setModalOpen(false);
        loadData();
      } else {
        toast.error(response.msg || (isEdit ? '更新失败' : '创建失败'));
      }
    } catch (error) {
      console.error('提交失败:', error);
      toast.error('网络错误，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 诊断隧道
  const handleDiagnose = async (tunnel: Tunnel) => {
    setCurrentDiagnosisTunnel(tunnel);
    setDiagnosisModalOpen(true);
    setDiagnosisLoading(true);
    setDiagnosisResult(null);

    try {
      const response = await diagnoseTunnel(tunnel.id);
      if (response.code === 0) {
        setDiagnosisResult(response.data);
      } else {
        toast.error(response.msg || '诊断失败');
        setDiagnosisResult({
          tunnelName: tunnel.name,
          tunnelType: tunnel.type === 1 ? '端口转发' : '隧道转发',
          timestamp: Date.now(),
          results: [{
            success: false,
            description: '诊断失败',
            nodeName: '-',
            nodeId: '-',
            targetIp: '-',
            targetPort: 443,
            message: response.msg || '诊断过程中发生错误'
          }]
        });
      }
    } catch (error) {
      console.error('诊断失败:', error);
      toast.error('网络错误，请重试');
      setDiagnosisResult({
        tunnelName: tunnel.name,
        tunnelType: tunnel.type === 1 ? '端口转发' : '隧道转发',
        timestamp: Date.now(),
        results: [{
          success: false,
          description: '网络错误',
          nodeName: '-',
          nodeId: '-',
          targetIp: '-',
          targetPort: 443,
          message: '无法连接到服务器'
        }]
      });
    } finally {
      setDiagnosisLoading(false);
    }
  };

  // 获取显示的IP（处理多IP）
  const getDisplayIp = (ipString?: string): string => {
    if (!ipString) return '-';
    
    const ips = ipString.split(',').map(ip => ip.trim()).filter(ip => ip);
    
    if (ips.length === 0) return '-';
    if (ips.length === 1) return ips[0];
    
    return `${ips[0]} 等${ips.length}个`;
  };

  // 获取节点名称
  const getNodeName = (nodeId?: number): string => {
    if (!nodeId) return '-';
    const node = nodes.find(n => n.id === nodeId);
    return node ? node.name : `节点${nodeId}`;
  };

  // 获取状态显示
  const getStatusDisplay = (status: number) => {
    switch (status) {
      case 1:
        return { text: '启用', color: 'success' };
      case 0:
        return { text: '禁用', color: 'default' };
      default:
        return { text: '未知', color: 'warning' };
    }
  };

  // 获取类型显示
  const getTypeDisplay = (type: number) => {
    switch (type) {
      case 1:
        return { text: '端口转发', color: 'primary' };
      case 2:
        return { text: '隧道转发', color: 'secondary' };
      default:
        return { text: '未知', color: 'default' };
    }
  };

  // 获取流量计算显示
  const getFlowDisplay = (flow: number) => {
    switch (flow) {
      case 1:
        return '单向计算';
      case 2:
        return '双向计算';
      default:
        return '未知';
    }
  };


  // 获取连接质量
  const getQualityDisplay = (averageTime?: number, packetLoss?: number) => {
    if (averageTime === undefined || packetLoss === undefined) return null;
    
    if (averageTime < 30 && packetLoss === 0) return { text: '🚀 优秀', color: 'success' };
    if (averageTime < 50 && packetLoss === 0) return { text: '✨ 很好', color: 'success' };
    if (averageTime < 100 && packetLoss < 1) return { text: '👍 良好', color: 'primary' };
    if (averageTime < 150 && packetLoss < 2) return { text: '😐 一般', color: 'warning' };
    if (averageTime < 200 && packetLoss < 5) return { text: '😟 较差', color: 'warning' };
    return { text: '😵 很差', color: 'danger' };
  };

  if (loading) {
    return (
      
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Spinner size="sm" />
            <span className="text-[#6b6560] dark:text-[#8a8480]">正在加载...</span>
          </div>
        </div>
      
    );
  }

  return (
    
      <div className="px-4 lg:px-6 py-4 lg:py-5">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-[17px] font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">隧道管理</h1>
          <Button
            size="sm"
            className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg"
            onPress={handleAdd}
          >
            新增隧道
          </Button>
        </div>

        {/* 隧道卡片网格 */}
        {tunnels.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {tunnels.map((tunnel) => {
              const statusDisplay = getStatusDisplay(tunnel.status);
              const typeDisplay = getTypeDisplay(tunnel.type);
              
              return (
                <Card key={tunnel.id} className="border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b] shadow-none rounded-xl hover:shadow-sm transition-shadow duration-200">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start w-full">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da] truncate text-sm">{tunnel.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border badge-status-info">
                            {typeDisplay.text}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
                            statusDisplay.color === 'success' ? 'badge-status-success' :
                            statusDisplay.color === 'warning' ? 'badge-status-warning' :
                            statusDisplay.color === 'danger' ? 'badge-status-danger' :
                            'badge-status-info'
                          }`}>
                            {statusDisplay.text}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardBody className="pt-0 pb-4">
                    <div className="space-y-2">
                      {/* 流程展示 */}
                      <div className="space-y-1.5">
                        <div className="p-2 bg-[#faf8f5] dark:bg-[#2d2824]/50 rounded border border-[#e5e0d8] dark:border-[#2d2824] dark:border-[#3d3834]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#6b6560] dark:text-[#8a8480]">入口节点</span>
                          </div>
                          <code className="text-xs font-mono text-[#1a1a1a] dark:text-[#e8e2da] block truncate">
                            {getNodeName(tunnel.inNodeId)}
                          </code>
                          <code className="text-xs font-mono text-[#9b9590] dark:text-[#5d5854] block truncate">
                            {getDisplayIp(tunnel.inIp)}
                          </code>
                        </div>
                        
                        <div className="text-center py-0.5">
                          <svg className="w-3 h-3 text-[#9b9590] dark:text-[#5d5854] mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                        
                        <div className="p-2 bg-[#faf8f5] dark:bg-[#2d2824]/50 rounded border border-[#e5e0d8] dark:border-[#2d2824] dark:border-[#3d3834]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#6b6560] dark:text-[#8a8480]">
                              {tunnel.type === 1 ? '出口节点（同入口）' : '出口节点'}
                            </span>
                          </div>
                          <code className="text-xs font-mono text-[#1a1a1a] dark:text-[#e8e2da] block truncate">
                            {tunnel.type === 1 ? getNodeName(tunnel.inNodeId) : getNodeName(tunnel.outNodeId)}
                          </code>
                          <code className="text-xs font-mono text-[#9b9590] dark:text-[#5d5854] block truncate">
                            {tunnel.type === 1 ? getDisplayIp(tunnel.inIp) : getDisplayIp(tunnel.outIp)}
                          </code>
                        </div>
                      </div>

                      {/* 配置信息 */}
                      <div className="flex justify-between items-center pt-2 border-t border-[#e5e0d8] dark:border-[#2d2824]">
                        <div className="text-left">
                          <div className="text-xs font-medium text-[#1a1a1a] dark:text-[#e8e2da]">
                            {getFlowDisplay(tunnel.flow)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-medium text-[#1a1a1a] dark:text-[#e8e2da]">
                            {tunnel.trafficRatio}x
                          </div>
                        </div>
                      </div>

                    </div>
                    
                    <div className="flex gap-1.5 mt-3">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        onPress={() => handleEdit(tunnel)}
                        className="flex-1 min-h-8"
                        startContent={
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        }
                      >
                        编辑
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        onPress={() => handleDiagnose(tunnel)}
                        className="flex-1 min-h-8"
                        startContent={
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                          </svg>
                        }
                      >
                        诊断
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        color="danger"
                        onPress={() => handleDelete(tunnel)}
                        className="flex-1 min-h-8"
                        startContent={
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                          </svg>
                        }
                      >
                        删除
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        ) : (
          /* 空状态 */
          <Card className="border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b] shadow-none rounded-xl">
            <CardBody className="text-center py-16">
              <svg className="w-10 h-10 text-[#d0cac2] dark:text-[#3d3834] mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
              </svg>
              <p className="text-sm text-[#9b9590] dark:text-[#5d5854]">暂无隧道配置</p>
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
                <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold">
                  {isEdit ? '编辑隧道' : '新增隧道'}
                </ModalHeader>
                <ModalBody>
                  <div className="space-y-4">
                    <Input
                      label="隧道名称"
                      placeholder="请输入隧道名称"
                      value={form.name}
                      onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                      isInvalid={!!errors.name}
                      errorMessage={errors.name}
                      variant="bordered"
                    />
                    
                    <Select
                      label="隧道类型"
                      placeholder="请选择隧道类型"
                      selectedKeys={[form.type.toString()]}
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        if (selectedKey) {
                          handleTypeChange(parseInt(selectedKey));
                        }
                      }}
                      isInvalid={!!errors.type}
                      errorMessage={errors.type}
                      variant="bordered"
                      isDisabled={isEdit}
                    >
                      <SelectItem key="1">端口转发</SelectItem>
                      <SelectItem key="2">隧道转发</SelectItem>
                    </Select>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Select
                        label="流量计算"
                        placeholder="请选择流量计算方式"
                        selectedKeys={[form.flow.toString()]}
                        onSelectionChange={(keys) => {
                          const selectedKey = Array.from(keys)[0] as string;
                          if (selectedKey) {
                            setForm(prev => ({ ...prev, flow: parseInt(selectedKey) }));
                          }
                        }}
                        isInvalid={!!errors.flow}
                        errorMessage={errors.flow}
                        variant="bordered"
                      >
                        <SelectItem key="1">单向计算（仅上传）</SelectItem>
                        <SelectItem key="2">双向计算（上传+下载）</SelectItem>
                      </Select>

                      <Input
                        label="流量倍率"
                        placeholder="请输入流量倍率"
                        type="number"
                        value={form.trafficRatio.toString()}
                        onChange={(e) => setForm(prev => ({ 
                          ...prev, 
                          trafficRatio: parseFloat(e.target.value) || 0
                        }))}
                        isInvalid={!!errors.trafficRatio}
                        errorMessage={errors.trafficRatio}
                        variant="bordered"
                        endContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-[#9b9590] dark:text-[#5d5854] text-small">x</span>
                          </div>
                        }
                      />
                    </div>

                    <Divider />
                    <h3 className="text-lg font-semibold">入口配置</h3>

                    <Select
                      label="入口节点"
                      placeholder="请选择入口节点"
                      selectedKeys={form.inNodeId ? [form.inNodeId.toString()] : []}
                      onSelectionChange={(keys) => {
                        const selectedKey = Array.from(keys)[0] as string;
                        if (selectedKey) {
                          setForm(prev => ({ ...prev, inNodeId: parseInt(selectedKey) }));
                        }
                      }}
                      isInvalid={!!errors.inNodeId}
                      errorMessage={errors.inNodeId}
                      variant="bordered"
                      isDisabled={isEdit}
                    >
                      {nodes.map((node) => (
                        <SelectItem 
                          key={node.id}
                          textValue={`${node.name} (${node.status === 1 ? '在线' : '离线'})`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{node.name}</span>
                            <Chip 
                              color={node.status === 1 ? 'success' : 'danger'} 
                              variant="flat" 
                              size="sm"
                            >
                              {node.status === 1 ? '在线' : '离线'}
                            </Chip>
                          </div>
                        </SelectItem>
                      ))}
                    </Select>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="TCP监听地址"
                        placeholder="请输入TCP监听地址"
                        value={form.tcpListenAddr}
                        onChange={(e) => setForm(prev => ({ ...prev, tcpListenAddr: e.target.value }))}
                        isInvalid={!!errors.tcpListenAddr}
                        errorMessage={errors.tcpListenAddr}
                        variant="bordered"
                        startContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-[#9b9590] dark:text-[#5d5854] text-small">TCP</span>
                          </div>
                        }
                      />

                      <Input
                        label="UDP监听地址"
                        placeholder="请输入UDP监听地址"
                        value={form.udpListenAddr}
                        onChange={(e) => setForm(prev => ({ ...prev, udpListenAddr: e.target.value }))}
                        isInvalid={!!errors.udpListenAddr}
                        errorMessage={errors.udpListenAddr}
                        variant="bordered"
                        startContent={
                          <div className="pointer-events-none flex items-center">
                            <span className="text-[#9b9590] dark:text-[#5d5854] text-small">UDP</span>
                          </div>
                        }
                      />
                    </div>

                    {/* 隧道转发时显示出口网卡配置 */}
                    {form.type === 2 && (
                      <Input
                        label="出口网卡名或IP"
                        placeholder="请输入出口网卡名或IP"
                        value={form.interfaceName}
                        onChange={(e) => setForm(prev => ({ ...prev, interfaceName: e.target.value }))}
                        isInvalid={!!errors.interfaceName}
                        errorMessage={errors.interfaceName}
                        variant="bordered"
                      />
                    )}

                    {/* 隧道转发时显示出口配置 */}
                    {form.type === 2 && (
                      <>
                        <Divider />
                        <h3 className="text-lg font-semibold">出口配置</h3>

                        <Select
                          label="协议类型"
                          placeholder="请选择协议类型"
                          selectedKeys={[form.protocol]}
                          onSelectionChange={(keys) => {
                            const selectedKey = Array.from(keys)[0] as string;
                            if (selectedKey) {
                              setForm(prev => ({ ...prev, protocol: selectedKey }));
                            }
                          }}
                          isInvalid={!!errors.protocol}
                          errorMessage={errors.protocol}
                          variant="bordered"
                        >
                          <SelectItem key="tls">TLS</SelectItem>
                          <SelectItem key="wss">WSS</SelectItem>
                          <SelectItem key="tcp">TCP</SelectItem>
                          <SelectItem key="mtls">MTLS</SelectItem>
                          <SelectItem key="mwss">MWSS</SelectItem>
                          <SelectItem key="mtcp">MTCP</SelectItem>
                        </Select>

                        <Select
                          label="出口节点"
                          placeholder="请选择出口节点"
                          selectedKeys={form.outNodeId ? [form.outNodeId.toString()] : []}
                          onSelectionChange={(keys) => {
                            const selectedKey = Array.from(keys)[0] as string;
                            if (selectedKey) {
                              setForm(prev => ({ ...prev, outNodeId: parseInt(selectedKey) }));
                            }
                          }}
                          isInvalid={!!errors.outNodeId}
                          errorMessage={errors.outNodeId}
                          variant="bordered"
                          isDisabled={isEdit}
                        >
                          {nodes.map((node) => (
                            <SelectItem 
                              key={node.id}
                              textValue={`${node.name} (${node.status === 1 ? '在线' : '离线'})`}
                            >
                              <div className="flex items-center justify-between">
                                <span>{node.name}</span>
                                <div className="flex items-center gap-2">
                                  <Chip 
                                    color={node.status === 1 ? 'success' : 'danger'} 
                                    variant="flat" 
                                    size="sm"
                                  >
                                    {node.status === 1 ? '在线' : '离线'}
                                  </Chip>
                                  {form.inNodeId === node.id && (
                                    <Chip color="warning" variant="flat" size="sm">
                                      已选为入口
                                    </Chip>
                                  )}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </Select>
                      </>
                    )}

                    <Alert
                        color="primary"
                        variant="flat"
                        title="TCP,UDP监听地址"
                        description="V6或者双栈填写[::],V4填写0.0.0.0。不懂的就去看文档网站内的说明"
                        className="mt-4"
                      />
                      <Alert
                        color="primary"
                        variant="flat"
                        title="出口网卡名或IP"
                        description="用于多IP服务器指定使用那个IP和出口服务器通讯，不懂的默认为空就行"
                        className="mt-4"
                      />
                  </div>
                </ModalBody>
                <ModalFooter className="border-t border-[#e5e0d8] dark:border-[#2d2824] pt-4">
                  <Button variant="light" className="text-[#6b6560] dark:text-[#8a8480]" onPress={onClose}>
                    取消
                  </Button>
                  <Button
                    className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg"
                    onPress={handleSubmit}
                    isLoading={submitLoading}
                  >
                    {submitLoading ? (isEdit ? '更新中...' : '创建中...') : (isEdit ? '更新' : '创建')}
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
                <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold text-[#791F1F] dark:text-[#f7a0a0]">确认删除</ModalHeader>
                <ModalBody>
                  <p className="text-[#6b6560] dark:text-[#8a8480]">确定要删除隧道 <span className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">"{tunnelToDelete?.name}"</span> 吗？</p>
                  <p className="text-sm text-[#9b9590] dark:text-[#5d5854] mt-2">此操作不可恢复，请谨慎操作。</p>
                </ModalBody>
                <ModalFooter className="border-t border-[#e5e0d8] dark:border-[#2d2824] pt-4">
                  <Button variant="light" className="text-[#6b6560] dark:text-[#8a8480]" onPress={onClose}>
                    取消
                  </Button>
                  <Button 
                    color="danger" 
                    onPress={confirmDelete}
                    isLoading={deleteLoading}
                  >
                    {deleteLoading ? '删除中...' : '确认删除'}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* 诊断结果模态框 */}
        <Modal 
          isOpen={diagnosisModalOpen}
          onOpenChange={setDiagnosisModalOpen}
          size="2xl"
        scrollBehavior="outside"
        backdrop="blur"
        placement="center"
        >
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold">
                  隧道诊断结果
                  {currentDiagnosisTunnel && (
                    <div className="flex items-center gap-2">
                      <span className="text-small text-[#9b9590] dark:text-[#5d5854]">{currentDiagnosisTunnel.name}</span>
                      <Chip 
                        color={currentDiagnosisTunnel.type === 1 ? 'primary' : 'secondary'} 
                        variant="flat" 
                        size="sm"
                      >
                        {currentDiagnosisTunnel.type === 1 ? '端口转发' : '隧道转发'}
                      </Chip>
                    </div>
                  )}
                </ModalHeader>
                <ModalBody>
                  {diagnosisLoading ? (
                    <div className="flex items-center justify-center py-16">
                      <div className="flex items-center gap-3">
                        <Spinner size="sm" />
                        <span className="text-[#6b6560] dark:text-[#8a8480]">正在诊断...</span>
                      </div>
                    </div>
                  ) : diagnosisResult ? (
                    <div className="space-y-4">
                      {diagnosisResult.results.map((result, index) => {
                        const quality = getQualityDisplay(result.averageTime, result.packetLoss);
                        
                        return (
                          <Card key={index} className={`rounded-2xl shadow-sm border ${result.success ? 'border-success' : 'border-danger'}`}>
                            <CardHeader className="pb-2">
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    result.success ? 'bg-success text-white' : 'bg-danger text-white'
                                  }`}>
                                    {result.success ? '✓' : '✗'}
                                  </div>
                                  <div>
                                    <h4 className="font-semibold">{result.description}</h4>
                                    <p className="text-small text-[#9b9590] dark:text-[#5d5854]">{result.nodeName}</p>
                                  </div>
                                </div>
                                <Chip 
                                  color={result.success ? 'success' : 'danger'} 
                                  variant="flat"
                                >
                                  {result.success ? '成功' : '失败'}
                                </Chip>
                              </div>
                            </CardHeader>
                            <CardBody className="pt-0">
                              {result.success ? (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-[#c96442] dark:text-[#d4856a]">{result.averageTime?.toFixed(0)}</div>
                                      <div className="text-small text-[#9b9590] dark:text-[#5d5854]">平均延迟(ms)</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-warning">{result.packetLoss?.toFixed(1)}</div>
                                      <div className="text-small text-[#9b9590] dark:text-[#5d5854]">丢包率(%)</div>
                                    </div>
                                    <div className="text-center">
                                      {quality && (
                                        <>
                                          <Chip color={quality.color as any} variant="flat" size="lg">
                                            {quality.text}
                                          </Chip>
                                          <div className="text-small text-[#9b9590] dark:text-[#5d5854] mt-1">连接质量</div>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-small text-[#9b9590] dark:text-[#5d5854]">
                                    目标地址: <code className="font-mono">{result.targetIp}{result.targetPort ? ':' + result.targetPort : ''}</code>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="text-small text-[#9b9590] dark:text-[#5d5854]">
                                    目标地址: <code className="font-mono">{result.targetIp}{result.targetPort ? ':' + result.targetPort : ''}</code>
                                  </div>
                                  <Alert
                                    color="danger"
                                    variant="flat"
                                    title="错误详情"
                                    description={result.message}
                                  />
                                </div>
                              )}
                            </CardBody>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-16 h-16 bg-[#f0ece6] dark:bg-[#2d2824] rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-[#9b9590] dark:text-[#5d5854]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">暂无诊断数据</h3>
                    </div>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>
                    关闭
                  </Button>
                  {currentDiagnosisTunnel && (
                    <Button 
                      className="claude-btn claude-btn-primary" 
                      onPress={() => handleDiagnose(currentDiagnosisTunnel)}
                      isLoading={diagnosisLoading}
                    >
                      重新诊断
                    </Button>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      </div>
    
  );
} 