import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Process } from '../types';

interface ProcessTreeProps {
  processes: Process[];
}

interface TreeNode extends d3.HierarchyNode<Process> {
  x: number;
  y: number;
}

export const ProcessTree: React.FC<ProcessTreeProps> = ({ processes }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || processes.length === 0) return;

    // Clear previous SVG content
    d3.select(svgRef.current).selectAll('*').remove();

    const width = 800;
    const height = 600;
    const margin = { top: 20, right: 90, bottom: 30, left: 90 };

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create hierarchy
    // We need a root node if there isn't one with ppid 0 or similar
    // In our mock data, systemd has pid 1 and ppid 0.
    const dataStructure = d3.stratify<Process>()
      .id(d => d.pid.toString())
      .parentId(d => d.ppid === 0 ? null : d.ppid?.toString() || null)
      (processes);

    const treeLayout = d3.tree<Process>().size([height - margin.top - margin.bottom, width - margin.left - margin.right]);
    const root = treeLayout(dataStructure);

    // Links
    svg.selectAll('.link')
      .data(root.links())
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal()
        .x((d: any) => d.y)
        .y((d: any) => d.x) as any)
      .attr('fill', 'none')
      .attr('stroke', '#2A2A2E')
      .attr('stroke-width', 1.5);

    // Nodes
    const node = svg.selectAll('.node')
      .data(root.descendants())
      .enter()
      .append('g')
      .attr('class', d => `node ${d.children ? 'node--internal' : 'node--leaf'}`)
      .attr('transform', d => `translate(${d.y},${d.x})`);

    node.append('circle')
      .attr('r', 4)
      .attr('fill', d => {
        if (d.data.status === 'suspicious') return '#ef4444';
        if (d.data.status === 'unknown') return '#eab308';
        return '#00FF41';
      })
      .attr('stroke', '#0D0D0F')
      .attr('stroke-width', 1);

    node.append('text')
      .attr('dy', '.35em')
      .attr('x', d => d.children ? -10 : 10)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => `${d.data.name} (${d.data.pid})`)
      .attr('fill', '#A1A1AA')
      .style('font-size', '10px')
      .style('font-family', 'monospace')
      .style('font-weight', 'bold');

  }, [processes]);

  return (
    <div className="w-full overflow-x-auto bg-[#0D0D0F]/50 rounded-sm border border-[#2A2A2E] p-4">
      <svg ref={svgRef}></svg>
    </div>
  );
};
