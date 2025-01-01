import React, { useState } from 'react';
import Papa from 'papaparse';
import { Table } from './components/ui/table';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { FileText } from 'lucide-react';

const getFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0];
};

const getShortAddress = (fullAddress) => {
  if (!fullAddress) return '';
  const parts = fullAddress.split(',')[0];
  const unitIndex = parts.toLowerCase().indexOf('unit');
  const aptIndex = parts.toLowerCase().indexOf('apt');
  let addressWithoutUnit = parts;
  
  if (unitIndex > -1) {
    addressWithoutUnit = parts.substring(0, unitIndex).trim();
  } else if (aptIndex > -1) {
    addressWithoutUnit = parts.substring(0, aptIndex).trim();
  }
  
  return addressWithoutUnit.split(' ').slice(1).join(' '); // Remove house number
};

const formatCurrency = (amount) => {
  if (!amount) return '$0';
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[$,]/g, ''));
  }
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

const roundToThousand = (amount) => {
  if (!amount) return 0;
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[$,]/g, ''));
  }
  return Math.floor(amount / 1000) * 1000;
};

const calculateLTV = (mortgageBalance, listPrice) => {
  if (!mortgageBalance || !listPrice) return 0;
  const balance = typeof mortgageBalance === 'string' ? 
    parseFloat(mortgageBalance.replace(/[$,]/g, '')) : mortgageBalance;
  return (balance / listPrice) * 100;
};

const generateLOI = (property) => {
  const agentFirstName = getFirstName(property.MLS_Curr_ListAgentName);
  const shortAddress = getShortAddress(property.PropertyAddress);
  const roundedBalance = roundToThousand(property.EstimatedMortgageBalance);
  const ltv = calculateLTV(property.EstimatedMortgageBalance, property.MLS_Curr_ListPrice);
  
  // No mortgage balance template
  if (roundedBalance === 0) {
    return `Hey ${agentFirstName},

Are you still trying to sell the house on ${shortAddress}? I think ${formatCurrency(property.MLS_Curr_ListPrice)} sounds pretty reasonable for it. Would your seller be open to a conversation about possibly selling on terms? Most of the other houses I've bought in this area, I gave the seller a down payment and paid them over time. I pay for agent commissions and closing costs typically as well.

Is this possibly worth a further conversation, or am I being completely unreasonable?

Thanks,
StudentName`;
  }
  
  // Low equity template
  if (ltv > 90) {
    return `Hey ${agentFirstName},

Are you still trying to sell the house on ${shortAddress}? From what I can see online, it looks like your seller has a remaining mortgage balance of about ${formatCurrency(roundedBalance)}. With how tough the market is right now, it seems like it might be hard for them to sell this without coming out of pocket. If I could pay for all closing costs (including your commission) and pay some cash to them, do you think we could have a conversation about how my process works?

Or am I being completely unreasonable?

Thanks,
StudentName`;
  }
  
  // Standard template
  return `Hey ${agentFirstName},

Are you still trying to sell the house on ${shortAddress}? From what I can see online, it looks like I could probably pay ${formatCurrency(property.MLS_Curr_ListPrice)} for it.
I'm a local investor, and I've worked with other sellers in ${property.PropertyCity} who were able to sell to me on terms that made sense for them. Basically how it works is I cover all closing costs (including your commission), pay them some cash upfront, and pay out their equity over time. Do you think it'd be worth having a quick chat about how my process could work for them?

Or am I way off base here?

Thanks,
StudentName`;
};

export default function LOIGenerator() {
  const [data, setData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        const processedData = results.data
          .filter(row => row && typeof row === 'object')
          .map(row => ({
            ...row,
            ltv: calculateLTV(row.EstimatedMortgageBalance, row.MLS_Curr_ListPrice),
            roundedBalance: roundToThousand(row.EstimatedMortgageBalance)
          }));
        setData(processedData);
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
      }
    });
  };

  const downloadLOI = (property) => {
    const content = generateLOI(property);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LOI_${getShortAddress(property.PropertyAddress).replace(/[^a-z0-9]/gi, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = data.slice(indexOfFirstItem, indexOfLastItem);
  const pageCount = Math.ceil(data.length / itemsPerPage);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Card className="p-6">
        <h1 className="text-2xl font-bold mb-4">LOI Generator</h1>
        
        <div className="mb-6">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-slate-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-violet-50 file:text-violet-700
              hover:file:bg-violet-100"
          />
        </div>

        {data.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th className="p-2">Address</th>
                  <th className="p-2">List Price</th>
                  <th className="p-2">Mortgage Balance</th>
                  <th className="p-2">LTV</th>
                  <th className="p-2">Agent</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentItems.map((property, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2">{getShortAddress(property.PropertyAddress)}</td>
                    <td className="p-2">{formatCurrency(property.MLS_Curr_ListPrice)}</td>
                    <td className="p-2">{formatCurrency(property.roundedBalance)}</td>
                    <td className="p-2">{property.ltv.toFixed(1)}%</td>
                    <td className="p-2">{getFirstName(property.MLS_Curr_ListAgentName)}</td>
                    <td className="p-2">
                      <Button
                        onClick={() => downloadLOI(property)}
                        className="flex items-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Download LOI</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="mt-4 flex justify-between items-center">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span>
                Page {currentPage} of {pageCount}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, pageCount))}
                disabled={currentPage === pageCount}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}