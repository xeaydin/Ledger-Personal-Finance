import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Plus, ArrowUpRight, ArrowDownRight, Briefcase, LineChart } from 'lucide-react';
import { useAppData } from '../context/AppDataContext';
import './Investments.css';

export default function Investments() {
  const { assets } = useAppData();

  const totalValue = assets.reduce((acc, curr) => acc + curr.units * curr.value, 0);
  const totalGrowth = 450.5;
  const growthPercentage = 3.2;

  return (
    <div className="page-layout">
      <header className="page-header">
        <div>
          <h1 className="text-gradient">Investment Portfolio</h1>
          <p className="text-secondary mt-1">Track funds, stocks, and crypto assets.</p>
        </div>
        <Button variant="primary" type="button" aria-label="Add asset">
          <Plus size={18} />
          <span>Add asset</span>
        </Button>
      </header>

      <div className="investments-summary-grid">
        <Card className="glass-panel summary-hero">
          <CardHeader>
            <CardTitle>Total portfolio value</CardTitle>
            <Briefcase className="text-primary" size={20} />
          </CardHeader>
          <CardContent>
            <h2 className="amount-display">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
            <div className="growth-indicator positive mt-2">
              <ArrowUpRight size={18} />
              <span>
                +${totalGrowth} ({growthPercentage}%) today
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="asset-type-cards">
          <Card className="glass-panel type-card">
            <div className="type-icon bg-blue">📈</div>
            <div className="type-info">
              <span className="text-secondary text-sm">Funds</span>
              <span className="font-medium text-lg">$8,492.10</span>
            </div>
          </Card>
          <Card className="glass-panel type-card">
            <div className="type-icon bg-purple">🏢</div>
            <div className="type-info">
              <span className="text-secondary text-sm">Stocks</span>
              <span className="font-medium text-lg">$2,632.50</span>
            </div>
          </Card>
          <Card className="glass-panel type-card">
            <div className="type-icon bg-warning">₿</div>
            <div className="type-info">
              <span className="text-secondary text-sm">Crypto</span>
              <span className="font-medium text-lg">$18,250.00</span>
            </div>
          </Card>
        </div>
      </div>

      <Card className="glass-panel mt-6">
        <CardHeader>
          <CardTitle>Asset holdings</CardTitle>
          <Button variant="icon" type="button" aria-label="Portfolio trend" title="Trend">
            <LineChart size={18} />
          </Button>
        </CardHeader>
        <CardContent className="no-padding">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Holdings</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total value</TableHead>
                <TableHead className="text-right">24h growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map(asset => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>
                    <span className={`badge badge-type-${asset.type.toLowerCase()}`}>{asset.type}</span>
                  </TableCell>
                  <TableCell className="text-right text-secondary">
                    {asset.units.toLocaleString()} units
                  </TableCell>
                  <TableCell className="text-right text-secondary">
                    ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="font-medium text-right">
                    $
                    {(asset.units * asset.value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`growth-badge ${asset.growth >= 0 ? 'positive' : 'negative'}`}>
                      {asset.growth >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(asset.growth)}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
