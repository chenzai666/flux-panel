import { useState, useEffect, useRef } from "react";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { Textarea } from "@heroui/input";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/modal";
import { Chip } from "@heroui/chip";
import { Switch } from "@heroui/switch";
import { Spinner } from "@heroui/spinner";
import { Alert } from "@heroui/alert";
import { Progress } from "@heroui/progress";
import { Accordion, AccordionItem } from "@heroui/accordion";
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


import {
  createNode,
  getNodeList,
  updateNode,
  deleteNode,
  batchDeleteNode,
  getNodeInstallCommand
} from "@/api";

interface Node {
  id: number;
  name: string;
  ip: string;
  serverIp: string;
  port: string;
  tcpListenAddr?: string;
  udpListenAddr?: string;
  version?: string;
  http?: number; // 0 关 1 开
  tls?: number;  // 0 关 1 开
  socks?: number; // 0 关 1 开
  status: number; // 1: 在线, 0: 离线
  connectionStatus: 'online' | 'offline';
  systemInfo?: {
    cpuUsage: number;
    memoryUsage: number;
    uploadTraffic: number;
    downloadTraffic: number;
    uploadSpeed: number;
    downloadSpeed: number;
    uptime: number;
  } | null;
  copyLoading?: boolean;
}

interface NodeForm {
  id: number | null;
  name: string;
  serverIp: string;
  port: string;
  tcpListenAddr: string;
  udpListenAddr: string;
  interfaceName: string;
  http: number; // 0 关 1 开
  tls: number;  // 0 关 1 开
  socks: number; // 0 关 1 开
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';
  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatUptime(seconds: number): string {
  if (seconds === 0) return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

function formatTraffic(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getProgressColor(value: number, offline = false): "default" | "primary" | "secondary" | "success" | "warning" | "danger" {
  if (offline) return "default";
  if (value <= 50) return "success";
  if (value <= 80) return "warning";
  return "danger";
}

interface SortableNodeCardProps {
  node: Node;
  isBatchMode: boolean;
  selectedIds: Set<number>;
  toggleSelect: (id: number) => void;
  handleEdit: (node: Node) => void;
  handleDelete: (node: Node) => void;
  handleCopyInstallCommand: (node: Node) => void;
}

function SortableNodeCard({ node, isBatchMode, selectedIds, toggleSelect, handleEdit, handleDelete, handleCopyInstallCommand }: SortableNodeCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: node.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`group shadow-sm border border-divider hover:shadow-md transition-shadow duration-200${isBatchMode && selectedIds.has(node.id) ? ' ring-2 ring-danger' : ''}`}
        onClick={isBatchMode ? () => toggleSelect(node.id) : undefined}
        style={{ cursor: isBatchMode ? 'pointer' : 'default' }}
      >
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start w-full">
            {isBatchMode && (
              <input type="checkbox" className="mr-2 mt-0.5 flex-shrink-0 w-4 h-4 accent-[#c96442]"
                checked={selectedIds.has(node.id)} onChange={() => toggleSelect(node.id)}
                onClick={e => e.stopPropagation()} />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate text-sm">{node.name}</h3>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              {!isBatchMode && (
                <div className="cursor-grab active:cursor-grabbing p-1 text-default-400 hover:text-default-600 opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation" {...listeners}>
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
                </div>
              )}
              <Chip color={node.connectionStatus === 'online' ? 'success' : 'danger'} variant="flat" size="sm" className="text-xs">
                {node.connectionStatus === 'online' ? '在线' : '离线'}
              </Chip>
            </div>
          </div>
        </CardHeader>
        <CardBody className="pt-0 pb-3">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center text-sm min-w-0">
              <span className="text-default-600 flex-shrink-0">IP</span>
              <div className="text-right text-xs min-w-0 flex-1 ml-2">
                <span className="font-mono truncate block" title={node.serverIp.trim()}>{node.serverIp.trim()}</span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-default-600">版本</span>
              <span className="text-xs">{node.version || '未知'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-default-600">开机时间</span>
              <span className="text-xs">{node.connectionStatus === 'online' && node.systemInfo ? formatUptime(node.systemInfo.uptime) : '-'}</span>
            </div>
          </div>
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>CPU</span>
                  <span className="font-mono">{node.connectionStatus === 'online' && node.systemInfo ? `${node.systemInfo.cpuUsage.toFixed(1)}%` : '-'}</span>
                </div>
                <Progress value={node.connectionStatus === 'online' && node.systemInfo ? node.systemInfo.cpuUsage : 0}
                  color={getProgressColor(node.connectionStatus === 'online' && node.systemInfo ? node.systemInfo.cpuUsage : 0, node.connectionStatus !== 'online')}
                  size="sm" aria-label="CPU使用率" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>内存</span>
                  <span className="font-mono">{node.connectionStatus === 'online' && node.systemInfo ? `${node.systemInfo.memoryUsage.toFixed(1)}%` : '-'}</span>
                </div>
                <Progress value={node.connectionStatus === 'online' && node.systemInfo ? node.systemInfo.memoryUsage : 0}
                  color={getProgressColor(node.connectionStatus === 'online' && node.systemInfo ? node.systemInfo.memoryUsage : 0, node.connectionStatus !== 'online')}
                  size="sm" aria-label="内存使用率" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-default-50 dark:bg-default-100 rounded">
                <div className="text-default-600 mb-0.5">上传</div>
                <div className="font-mono">{node.connectionStatus === 'online' && node.systemInfo ? formatSpeed(node.systemInfo.uploadSpeed) : '-'}</div>
              </div>
              <div className="text-center p-2 bg-default-50 dark:bg-default-100 rounded">
                <div className="text-default-600 mb-0.5">下载</div>
                <div className="font-mono">{node.connectionStatus === 'online' && node.systemInfo ? formatSpeed(node.systemInfo.downloadSpeed) : '-'}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-center p-2 bg-primary-50 dark:bg-primary-100/20 rounded border border-primary-200 dark:border-primary-300/20">
                <div className="text-primary-600 dark:text-primary-400 mb-0.5">↑ 上行流量</div>
                <div className="font-mono text-primary-700 dark:text-primary-300">{node.connectionStatus === 'online' && node.systemInfo ? formatTraffic(node.systemInfo.uploadTraffic) : '-'}</div>
              </div>
              <div className="text-center p-2 bg-success-50 dark:bg-success-100/20 rounded border border-success-200 dark:border-success-300/20">
                <div className="text-success-600 dark:text-success-400 mb-0.5">↓ 下行流量</div>
                <div className="font-mono text-success-700 dark:text-success-300">{node.connectionStatus === 'online' && node.systemInfo ? formatTraffic(node.systemInfo.downloadTraffic) : '-'}</div>
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <div className="flex gap-1.5">
              <Button size="sm" variant="flat" color="success" onPress={() => handleCopyInstallCommand(node)} isLoading={node.copyLoading} className="flex-1 min-h-8">安装</Button>
              <Button size="sm" className="flex-1 min-h-8 text-[#c96442] bg-[#c96442]/10 hover:bg-[#c96442]/20" onPress={() => handleEdit(node)}>编辑</Button>
              {!isBatchMode && (
                <Button size="sm" variant="flat" color="danger" onPress={() => handleDelete(node)} className="flex-1 min-h-8">删除</Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default function NodePage() {
  const [nodeList, setNodeList] = useState<Node[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [isEdit, setIsEdit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [nodeToDelete, setNodeToDelete] = useState<Node | null>(null);
  const [protocolDisabled, setProtocolDisabled] = useState(false);
  const [protocolDisabledReason, setProtocolDisabledReason] = useState('');
  const [form, setForm] = useState<NodeForm>({
    id: null,
    name: '',
    serverIp: '',
    port: '1000-65535',
    tcpListenAddr: '[::]',
    udpListenAddr: '[::]',
    interfaceName: '',
    http: 0,
    tls: 0,
    socks: 0
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 批量操作状态
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchDeleteModalOpen, setBatchDeleteModalOpen] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  // 拖拽排序状态
  const [nodeOrder, setNodeOrder] = useState<number[]>([]);

  // 安装命令相关状态
  const [installCommandModal, setInstallCommandModal] = useState(false);
  const [installCommand, setInstallCommand] = useState('');
  const [currentNodeName, setCurrentNodeName] = useState('');
  
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    loadNodes();
    initWebSocket();
    
    return () => {
      closeWebSocket();
    };
  }, []);

  // 加载节点列表
  const loadNodes = async () => {
    setLoading(true);
    try {
      const res = await getNodeList();
      if (res.code === 0) {
        const nodes = res.data.map((node: any) => ({
          ...node,
          connectionStatus: node.status === 1 ? 'online' : 'offline',
          systemInfo: null,
          copyLoading: false
        }));
        setNodeList(nodes);
        const saved = localStorage.getItem('node-order');
        if (saved) {
          try {
            const savedIds: number[] = JSON.parse(saved);
            const validIds = savedIds.filter((id: number) => nodes.some((n: Node) => n.id === id));
            const missing = nodes.map((n: Node) => n.id).filter((id: number) => !validIds.includes(id));
            setNodeOrder([...validIds, ...missing]);
          } catch { setNodeOrder(nodes.map((n: Node) => n.id)); }
        } else {
          setNodeOrder(nodes.map((n: Node) => n.id));
        }
      } else {
        toast.error(res.msg || '加载节点列表失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 批量操作
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const enterBatchMode = () => { setIsBatchMode(true); setSelectedIds(new Set()); };
  const exitBatchMode = () => { setIsBatchMode(false); setSelectedIds(new Set()); };
  const handleSelectAll = () => {
    if (selectedIds.size === nodeList.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(nodeList.map(n => n.id)));
    }
  };
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleteLoading(true);
    try {
      const res = await batchDeleteNode(Array.from(selectedIds));
      if (res.code === 0) {
        toast.success('批量删除成功');
        setBatchDeleteModalOpen(false);
        exitBatchMode();
        loadNodes();
      } else {
        toast.error(res.msg || '批量删除失败');
      }
    } catch {
      toast.error('批量删除失败');
    } finally {
      setBatchDeleteLoading(false);
    }
  };
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setNodeOrder(prev => {
      const oldIndex = prev.indexOf(Number(active.id));
      const newIndex = prev.indexOf(Number(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;
      const newOrder = arrayMove(prev, oldIndex, newIndex);
      try { localStorage.setItem('node-order', JSON.stringify(newOrder)); } catch {}
      return newOrder;
    });
  };

  // 初始化WebSocket连接
  const initWebSocket = () => {
    if (websocketRef.current && 
        (websocketRef.current.readyState === WebSocket.OPEN || 
         websocketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }
    
    if (websocketRef.current) {
      closeWebSocket();
    }
    
    // 构建WebSocket URL，使用axios的baseURL
    const baseUrl = axios.defaults.baseURL || (import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api/v1/` : '/api/v1/');
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/$/, '') + `/system-info?type=0&secret=${localStorage.getItem('token')}`;
    
    try {
      websocketRef.current = new WebSocket(wsUrl);
      
      websocketRef.current.onopen = () => {
        reconnectAttemptsRef.current = 0;
      };
      
      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (error) {
          // 解析失败时不输出错误信息
        }
      };
      
      websocketRef.current.onerror = () => {
        // WebSocket错误时不输出错误信息
      };
      
      websocketRef.current.onclose = () => {
        websocketRef.current = null;
        attemptReconnect();
      };
    } catch (error) {
      attemptReconnect();
    }
  };

  // 处理WebSocket消息
  const handleWebSocketMessage = (data: any) => {
    const { id, type, data: messageData } = data;
    
    if (type === 'status') {
      setNodeList(prev => prev.map(node => {
        if (node.id == id) {
          return {
            ...node,
            connectionStatus: messageData === 1 ? 'online' : 'offline',
            systemInfo: messageData === 0 ? null : node.systemInfo
          };
        }
        return node;
      }));
    } else if (type === 'info') {
      setNodeList(prev => prev.map(node => {
        if (node.id == id) {
          try {
            let systemInfo;
            if (typeof messageData === 'string') {
              systemInfo = JSON.parse(messageData);
            } else {
              systemInfo = messageData;
            }
            
            const currentUpload = parseInt(systemInfo.bytes_transmitted) || 0;
            const currentDownload = parseInt(systemInfo.bytes_received) || 0;
            const currentUptime = parseInt(systemInfo.uptime) || 0;
            
            let uploadSpeed = 0;
            let downloadSpeed = 0;
            
            if (node.systemInfo && node.systemInfo.uptime) {
              const timeDiff = currentUptime - node.systemInfo.uptime;
              
              if (timeDiff > 0 && timeDiff <= 10) {
                const lastUpload = node.systemInfo.uploadTraffic || 0;
                const lastDownload = node.systemInfo.downloadTraffic || 0;
                
                const uploadDiff = currentUpload - lastUpload;
                const downloadDiff = currentDownload - lastDownload;
                
                const uploadReset = currentUpload < lastUpload;
                const downloadReset = currentDownload < lastDownload;
                
                if (!uploadReset && uploadDiff >= 0) {
                  uploadSpeed = uploadDiff / timeDiff;
                }
                
                if (!downloadReset && downloadDiff >= 0) {
                  downloadSpeed = downloadDiff / timeDiff;
                }
              }
            }
            
            return {
              ...node,
              connectionStatus: 'online',
              systemInfo: {
                cpuUsage: parseFloat(systemInfo.cpu_usage) || 0,
                memoryUsage: parseFloat(systemInfo.memory_usage) || 0,
                uploadTraffic: currentUpload,
                downloadTraffic: currentDownload,
                uploadSpeed: uploadSpeed,
                downloadSpeed: downloadSpeed,
                uptime: currentUptime
              }
            };
          } catch (error) {
            return node;
          }
        }
        return node;
      }));
    }
  };

  // 尝试重新连接
  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current < maxReconnectAttempts) {
      reconnectAttemptsRef.current++;
      
      reconnectTimerRef.current = setTimeout(() => {
        initWebSocket();
      }, 3000 * reconnectAttemptsRef.current);
    }
  };

  // 关闭WebSocket连接
  const closeWebSocket = () => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    reconnectAttemptsRef.current = 0;
    
    if (websocketRef.current) {
      websocketRef.current.onopen = null;
      websocketRef.current.onmessage = null;
      websocketRef.current.onerror = null;
      websocketRef.current.onclose = null;
      
      if (websocketRef.current.readyState === WebSocket.OPEN || 
          websocketRef.current.readyState === WebSocket.CONNECTING) {
        websocketRef.current.close();
      }
      
      websocketRef.current = null;
    }
    
    setNodeList(prev => prev.map(node => ({
      ...node,
      connectionStatus: 'offline',
      systemInfo: null
    })));
  };


  
  // 格式化速度

  // 验证IP地址格式
  const validateIp = (ip: string): boolean => {
    if (!ip || !ip.trim()) return false;
    
    const trimmedIp = ip.trim();
    
    // IPv4格式验证
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    // IPv6格式验证
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    
    if (ipv4Regex.test(trimmedIp) || ipv6Regex.test(trimmedIp) || trimmedIp === 'localhost') {
      return true;
    }
    
    // 验证域名格式
    if (/^\d+$/.test(trimmedIp)) return false;
    
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)+$/;
    const singleLabelDomain = /^[a-zA-Z][a-zA-Z0-9\-]{0,62}$/;
    
    return domainRegex.test(trimmedIp) || singleLabelDomain.test(trimmedIp);
  };

  // 验证端口格式：支持 80,443,100-600
  const validatePort = (portStr: string): { valid: boolean; error?: string } => {
    if (!portStr || !portStr.trim()) {
      return { valid: false, error: '请输入端口' };
    }

    const trimmed = portStr.trim();
    const parts = trimmed.split(',').map(p => p.trim()).filter(p => p);
    
    if (parts.length === 0) {
      return { valid: false, error: '请输入有效的端口' };
    }

    for (const part of parts) {
      // 检查是否是端口范围 (如 100-600)
      if (part.includes('-')) {
        const range = part.split('-').map(p => p.trim());
        if (range.length !== 2) {
          return { valid: false, error: `端口范围格式错误: ${part}` };
        }
        
        const start = parseInt(range[0]);
        const end = parseInt(range[1]);
        
        if (isNaN(start) || isNaN(end)) {
          return { valid: false, error: `端口必须是数字: ${part}` };
        }
        
        if (start < 1 || start > 65535 || end < 1 || end > 65535) {
          return { valid: false, error: `端口范围必须在 1-65535 之间: ${part}` };
        }
        
        if (start >= end) {
          return { valid: false, error: `起始端口必须小于结束端口: ${part}` };
        }
      } else {
        // 单个端口
        const port = parseInt(part);
        if (isNaN(port)) {
          return { valid: false, error: `端口必须是数字: ${part}` };
        }
        
        if (port < 1 || port > 65535) {
          return { valid: false, error: `端口必须在 1-65535 之间: ${part}` };
        }
      }
    }

    return { valid: true };
  };

  // 表单验证
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!form.name.trim()) {
      newErrors.name = '请输入节点名称';
    } else if (form.name.trim().length < 2) {
      newErrors.name = '节点名称长度至少2位';
    } else if (form.name.trim().length > 50) {
      newErrors.name = '节点名称长度不能超过50位';
    }
    
    if (!form.serverIp.trim()) {
      newErrors.serverIp = '请输入服务器IP地址';
    } else if (!validateIp(form.serverIp.trim())) {
      newErrors.serverIp = '请输入有效的IPv4、IPv6地址或域名';
    }
    
    const portValidation = validatePort(form.port);
    if (!portValidation.valid) {
      newErrors.port = portValidation.error || '端口格式错误';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 新增节点
  const handleAdd = () => {
    setDialogTitle('新增节点');
    setIsEdit(false);
    setDialogVisible(true);
    resetForm();
    setProtocolDisabled(true);
    setProtocolDisabledReason('节点未在线，等待节点上线后再设置');
  };

  // 编辑节点
  const handleEdit = (node: Node) => {
    setDialogTitle('编辑节点');
    setIsEdit(true);
    setForm({
      id: node.id,
      name: node.name,
      serverIp: node.serverIp || '',
      port: node.port || '1000-65535',
      tcpListenAddr: node.tcpListenAddr || '[::]',
      udpListenAddr: node.udpListenAddr || '[::]',
      interfaceName: (node as any).interfaceName || '',
      http: typeof node.http === 'number' ? node.http : 1,
      tls: typeof node.tls === 'number' ? node.tls : 1,
      socks: typeof node.socks === 'number' ? node.socks : 1
    });
    const offline = node.connectionStatus !== 'online';
    setProtocolDisabled(offline);
    setProtocolDisabledReason(offline ? '节点未在线，等待节点上线后再设置' : '');
    setDialogVisible(true);
  };

  // 删除节点
  const handleDelete = (node: Node) => {
    setNodeToDelete(node);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!nodeToDelete) return;
    
    setDeleteLoading(true);
    try {
      const res = await deleteNode(nodeToDelete.id);
      if (res.code === 0) {
        toast.success('删除成功');
        setNodeList(prev => prev.filter(n => n.id !== nodeToDelete.id));
        setDeleteModalOpen(false);
        setNodeToDelete(null);
      } else {
        toast.error(res.msg || '删除失败');
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setDeleteLoading(false);
    }
  };

  // 复制安装命令
  const handleCopyInstallCommand = async (node: Node) => {
    setNodeList(prev => prev.map(n => 
      n.id === node.id ? { ...n, copyLoading: true } : n
    ));
    
    try {
      const res = await getNodeInstallCommand(node.id);
      if (res.code === 0 && res.data) {
        try {
          await navigator.clipboard.writeText(res.data);
          toast.success('安装命令已复制到剪贴板');
        } catch (copyError) {
          // 复制失败，显示安装命令模态框
          setInstallCommand(res.data);
          setCurrentNodeName(node.name);
          setInstallCommandModal(true);
        }
      } else {
        toast.error(res.msg || '获取安装命令失败');
      }
    } catch (error) {
      toast.error('获取安装命令失败');
    } finally {
      setNodeList(prev => prev.map(n => 
        n.id === node.id ? { ...n, copyLoading: false } : n
      ));
    }
  };

  // 手动复制安装命令
  const handleManualCopy = async () => {
    try {
      await navigator.clipboard.writeText(installCommand);
      toast.success('安装命令已复制到剪贴板');
      setInstallCommandModal(false);
    } catch (error) {
      toast.error('复制失败，请手动选择文本复制');
    }
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setSubmitLoading(true);
    
    try {
      const apiCall = isEdit ? updateNode : createNode;
      const data = { 
        ...form
      };
      
      const res = await apiCall(data);
      if (res.code === 0) {
        toast.success(isEdit ? '更新成功' : '创建成功');
        setDialogVisible(false);
        
        if (isEdit) {
          setNodeList(prev => prev.map(n => 
            n.id === form.id ? {
              ...n,
              name: form.name,
              serverIp: form.serverIp,
              port: form.port,
              tcpListenAddr: form.tcpListenAddr,
              udpListenAddr: form.udpListenAddr,
              interfaceName: form.interfaceName,
              http: form.http,
              tls: form.tls,
              socks: form.socks
            } : n
          ));
        } else {
          loadNodes();
        }
      } else {
        toast.error(res.msg || (isEdit ? '更新失败' : '创建失败'));
      }
    } catch (error) {
      toast.error('网络错误，请重试');
    } finally {
      setSubmitLoading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setForm({
      id: null,
      name: '',
      serverIp: '',
      port: '1000-65535',
      tcpListenAddr: '[::]',
      udpListenAddr: '[::]',
      interfaceName: '',
      http: 0,
      tls: 0,
      socks: 0
    });
    setErrors({});
  };

  return (
    
      <div className="px-3 lg:px-6 py-8">
        {/* 页面头部 */}
        <div className="flex items-center justify-between mb-6">
          {isBatchMode ? (
            <>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={nodeList.length > 0 && selectedIds.size === nodeList.length}
                    ref={el => { if (el) el.indeterminate = selectedIds.size > 0 && selectedIds.size < nodeList.length; }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 accent-[#c96442] cursor-pointer"
                  />
                  <span className="text-sm text-[#6b6560] dark:text-[#8a8480]">
                    {selectedIds.size > 0 ? `已选 ${selectedIds.size} 项` : '全选'}
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" color="danger" variant="flat" isDisabled={selectedIds.size === 0}
                  onPress={() => setBatchDeleteModalOpen(true)} className="font-medium">
                  删除 ({selectedIds.size})
                </Button>
                <Button size="sm" variant="light" className="text-[#6b6560]" onPress={exitBatchMode}>
                  取消
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                {nodeList.length > 0 && (
                  <Button size="sm" variant="flat" className="text-[#6b6560] dark:text-[#8a8480]" onPress={enterBatchMode}>
                    批量操作
                  </Button>
                )}
                <Button size="sm" className="bg-[#c96442] text-white hover:bg-[#b5583a] rounded-lg" onPress={handleAdd}>
                  新增
                </Button>
              </div>
            </>
          )}
        </div>

        {/* 节点列表 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <span className="text-default-600">正在加载...</span>
            </div>
          </div>
        ) : nodeList.length === 0 ? (
          <Card className="shadow-none border border-[#e5e0d8] dark:border-[#2d2824] bg-white dark:bg-[#231e1b]">
            <CardBody className="text-center py-16">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-default-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-default-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12l4-4m-4 4l4 4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">暂无节点配置</h3>
                  <p className="text-default-500 text-sm mt-1">还没有创建任何节点配置，点击上方按钮开始创建</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={nodeOrder} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {(nodeOrder.length > 0 ? nodeOrder.map(id => nodeList.find(n => n.id === id)).filter((n): n is Node => n !== undefined) : nodeList).map((node) => (
                  <SortableNodeCard
                    key={node.id}
                    node={node}
                    isBatchMode={isBatchMode}
                    selectedIds={selectedIds}
                    toggleSelect={toggleSelect}
                    handleEdit={handleEdit}
                    handleDelete={handleDelete}
                    handleCopyInstallCommand={handleCopyInstallCommand}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* 新增/编辑节点对话框 */}
        <Modal 
          isOpen={dialogVisible} 
          onClose={() => setDialogVisible(false)}
          size="2xl"
          scrollBehavior="outside"
          backdrop="blur"
          placement="center"
        >
          <ModalContent>
            <ModalHeader>{dialogTitle}</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <Input
                  label="节点名称"
                  placeholder="请输入节点名称"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  isInvalid={!!errors.name}
                  errorMessage={errors.name}
                  variant="bordered"
                />

                <Input
                  label="服务器IP"
                  placeholder="请输入服务器IP地址，如: 192.168.1.100 或 example.com"
                  value={form.serverIp}
                  onChange={(e) => setForm(prev => ({ ...prev, serverIp: e.target.value }))}
                  isInvalid={!!errors.serverIp}
                  errorMessage={errors.serverIp}
                  variant="bordered"
                />

                <Input
                  label="可用端口"
                  placeholder="例如: 80,443,1000-65535"
                  value={form.port}
                  onChange={(e) => setForm(prev => ({ ...prev, port: e.target.value }))}
                  isInvalid={!!errors.port}
                  errorMessage={errors.port}
                  variant="bordered"
                  description="支持单个端口(80)、多个端口(80,443)或端口范围(1000-65535)，多个可用逗号分隔"
                  classNames={{
                    input: "font-mono"
                  }}
                />

                {/* 高级配置 */}
                <Accordion variant="bordered">
                  <AccordionItem 
                    key="advanced" 
                    aria-label="高级配置"
                    title="高级配置"
                  >
                    <div className="space-y-4 pb-2">
                      <Input
                        label="出口网卡名或IP"
                        placeholder="请输入出口网卡名或IP"
                        value={form.interfaceName}
                        onChange={(e) => setForm(prev => ({ ...prev, interfaceName: e.target.value }))}
                        isInvalid={!!errors.interfaceName}
                        errorMessage={errors.interfaceName}
                        variant="bordered"
                        description="用于多IP服务器指定使用那个IP请求远程地址，不懂的默认为空就行"
                      />

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
                              <span className="text-default-400 text-small">TCP</span>
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
                              <span className="text-default-400 text-small">UDP</span>
                            </div>
                          }
                        />
                      </div>
                      {/* 屏蔽协议 */}
                      <div>
                        <div className="text-sm font-medium text-default-700 mb-2">屏蔽协议</div>
                        <div className="text-xs text-default-500 mb-2">开启开关以屏蔽对应协议</div>
                        {protocolDisabled && (
                          <Alert
                            color="warning"
                            variant="flat"
                            description={protocolDisabledReason || '等待节点上线后再设置'}
                            className="mb-2"
                          />
                        )}
                        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#faf8f5] dark:bg-[#2d2824]/50 p-3 rounded-md border border-[#e5e0d8] dark:border-[#3d3834] ${protocolDisabled ? 'opacity-70' : ''}`}>
                          {/* HTTP tile */}
                          <div className="px-3 py-3 rounded-lg bg-white dark:bg-[#231e1b] border border-[#e5e0d8] dark:border-[#3d3834] hover:border-[#c96442]/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-default-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10h20"/></svg>
                              <div className="text-sm font-medium text-default-700">HTTP</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-default-500">禁用/启用</div>
                              <Switch
                                size="sm"
                                isSelected={form.http === 1}
                                isDisabled={protocolDisabled}
                                onValueChange={(v) => setForm(prev => ({ ...prev, http: v ? 1 : 0 }))}
                              />
                            </div>
                            <div className="mt-1 text-xs text-default-400">{form.http === 1 ? '已开启' : '已关闭'}</div>
                          </div>

                          {/* TLS tile */}
                          <div className="px-3 py-3 rounded-lg bg-white dark:bg-[#231e1b] border border-[#e5e0d8] dark:border-[#3d3834] hover:border-[#c96442]/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-default-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 10V7a6 6 0 1 1 12 0v3"/><rect x="4" y="10" width="16" height="10" rx="2"/></svg>
                              <div className="text-sm font-medium text-default-700">TLS</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-default-500">禁用/启用</div>
                              <Switch
                                size="sm"
                                isSelected={form.tls === 1}
                                isDisabled={protocolDisabled}
                                onValueChange={(v) => setForm(prev => ({ ...prev, tls: v ? 1 : 0 }))}
                              />
                            </div>
                            <div className="mt-1 text-xs text-default-400">{form.tls === 1 ? '已开启' : '已关闭'}</div>
                          </div>

                          {/* SOCKS tile */}
                          <div className="px-3 py-3 rounded-lg bg-white dark:bg-[#231e1b] border border-[#e5e0d8] dark:border-[#3d3834] hover:border-[#c96442]/30 transition-colors">
                            <div className="flex items-center gap-2 mb-2">
                              <svg className="w-4 h-4 text-default-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                              <div className="text-sm font-medium text-default-700">SOCKS</div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-default-500">禁用/启用</div>
                              <Switch
                                size="sm"
                                isSelected={form.socks === 1}
                                isDisabled={protocolDisabled}
                                onValueChange={(v) => setForm(prev => ({ ...prev, socks: v ? 1 : 0 }))}
                              />
                            </div>
                            <div className="mt-1 text-xs text-default-400">{form.socks === 1 ? '已开启' : '已关闭'}</div>
                          </div>
                        </div>
                      </div>

                      <Alert
                        color="danger"
                        variant="flat"
                        description="请不要在出口节点执行屏蔽协议，否则可能影响转发；屏蔽协议仅需在入口节点执行。"
                      />
                    </div>
                  </AccordionItem>
                </Accordion>

                <Alert
                  color="primary"
                  variant="flat"
                  description="服务器ip是你要添加的服务器的ip地址，不是面板的ip地址。"
                  className="mt-4"
                />
                
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setDialogVisible(false)}
              >
                取消
              </Button>
              <Button
                className="bg-[#c96442] text-white hover:bg-[#b5583a] font-medium rounded-lg"
                onPress={handleSubmit}
                isLoading={submitLoading}
              >
                {submitLoading ? '提交中...' : '确定'}
              </Button>
            </ModalFooter>
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
                  <h2 className="text-xl font-bold">确认删除</h2>
                </ModalHeader>
                <ModalBody>
                  <p>确定要删除节点 <strong>"{nodeToDelete?.name}"</strong> 吗？</p>
                  <p className="text-small text-default-500">此操作不可恢复，请谨慎操作。</p>
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
                    {deleteLoading ? '删除中...' : '确认删除'}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* 批量删除确认模态框 */}
        <Modal isOpen={batchDeleteModalOpen} onOpenChange={setBatchDeleteModalOpen} size="sm" backdrop="blur" placement="center">
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="border-b border-[#e5e0d8] dark:border-[#2d2824] pb-4 text-[15px] font-semibold text-[#791F1F] dark:text-[#f7a0a0]">批量删除确认</ModalHeader>
                <ModalBody className="py-4">
                  <p className="text-[#6b6560] dark:text-[#8a8480]">确定要删除选中的 <span className="font-semibold text-[#1a1a1a] dark:text-[#e8e2da]">{selectedIds.size}</span> 个节点吗？</p>
                  <p className="text-xs text-default-400">此操作不可恢复，关联的隧道也会一并删除。</p>
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={onClose}>取消</Button>
                  <Button color="danger" onPress={handleBatchDelete} isLoading={batchDeleteLoading}>
                    {batchDeleteLoading ? '删除中...' : `确认删除 ${selectedIds.size} 个`}
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>

        {/* 安装命令模态框 */}
        <Modal 
          isOpen={installCommandModal} 
          onClose={() => setInstallCommandModal(false)}
          size="2xl"
        scrollBehavior="outside"
        backdrop="blur"
        placement="center"
        >
          <ModalContent>
            <ModalHeader>安装命令 - {currentNodeName}</ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <p className="text-sm text-default-600">
                  请复制以下安装命令到服务器上执行：
                </p>
                <div className="relative">
                  <Textarea
                    value={installCommand}
                    readOnly
                    variant="bordered"
                    minRows={6}
                    maxRows={10}
                    className="font-mono text-sm"
                    classNames={{
                      input: "font-mono text-sm"
                    }}
                  />
                  <Button
                    size="sm"
                    className="absolute top-2 right-2 bg-[#c96442]/10 text-[#c96442] hover:bg-[#c96442]/20 rounded-lg"
                    onPress={handleManualCopy}
                  >
                    复制
                  </Button>
                </div>
                <div className="text-xs text-default-500">
                  💡 提示：如果复制按钮失效，请手动选择上方文本进行复制
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                variant="flat"
                onPress={() => setInstallCommandModal(false)}
              >
                关闭
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    
  );
} 