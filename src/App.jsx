import React, { useState } from 'react';
import Papa from 'papaparse';
import { Table } from './components/ui/table';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';
import { FileText, Download } from 'lucide-react';

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

const LOI_TEMPLATES = {
  noMortgage: {
    v1: (data) => `Hey ${data.agentFirstName},

Are you still trying to sell the house on ${data.shortAddress}? I think ${data.listPrice} sounds pretty reasonable for it. Would your seller be open to a conversation about possibly selling on terms? Most of the other houses I've bought in this area, I gave the seller a down payment and paid them over time. I pay for agent commissions and closing costs typically as well.

Is this possibly worth a further conversation, or am I being completely unreasonable?

Thanks,
StudentName`,
    
    v2: (data) => `Hi ${data.agentFirstName},

I noticed your listing on ${data.shortAddress} and wanted to reach out. I'm an investor who specializes in flexible purchase arrangements that can really benefit sellers. For properties like this one listed at ${data.listPrice}, I typically offer a substantial down payment plus ongoing payments that could provide steady income for your seller.

Would you be open to a brief call to discuss how this could work for your client? I cover all closing costs and your full commission, of course.

Best regards,
StudentName`,
    
    v3: (data) => `${data.agentFirstName},

Quick question about ${data.shortAddress} - are you still looking for buyers? I've helped several sellers in the area with my terms-based purchase program. At ${data.listPrice}, I could structure a deal with a good down payment plus monthly payments that could really work for your seller.

I handle all closing costs and commissions. Could we discuss this approach?

Thanks,
StudentName`
  },

  lowEquity: {
    v1: (data) => `Hey ${data.agentFirstName},

Are you still trying to sell the house on ${data.shortAddress}? From what I can see online, it looks like your seller has a remaining mortgage balance of about ${data.mortgageBalance}. With how tough the market is right now, it seems like it might be hard for them to sell this without coming out of pocket. If I could pay for all closing costs (including your commission) and pay some cash to them, do you think we could have a conversation about how my process works?

Or am I being completely unreasonable?

Thanks,
StudentName`,
    
    v2: (data) => `Hi ${data.agentFirstName},

I've been analyzing properties in the area and noticed the listing on ${data.shortAddress}. Given the current mortgage situation (approximately ${data.mortgageBalance}), I might have a solution that could help your seller avoid any out-of-pocket costs at closing.

My approach covers all closing costs, including your commission, plus provides some cash to the seller. Would you be interested in learning more about how this could work?

Best regards,
StudentName`,
    
    v3: (data) => `${data.agentFirstName},

The listing at ${data.shortAddress} caught my attention. I specialize in helping sellers in tight equity situations like this one (noting the approximate ${data.mortgageBalance} balance). My solution typically saves sellers from bringing money to closing while ensuring agents receive their full commission.

Could we discuss how this might benefit your client?

Thanks,
StudentName`
  },

  standard: {
    v1: (data) => `Hey ${data.agentFirstName},
Are you still trying to sell the house on ${data.shortAddress}? From what I can see online, it looks like I could probably pay ${data.listPrice} for it.
I'm a local investor, and I've worked with other sellers in ${data.city} who were able to sell to me on terms that made sense for them. Basically how it works is I cover all closing costs (including your commission), pay them some cash upfront, and pay out their equity over time. Do you think it'd be worth having a quick chat about how my process could work for them?

Or am I way off base here?

Thanks,
StudentName`,
    
    v2: (data) => `Hi ${data.agentFirstName},

I noticed your listing at ${data.shortAddress} and believe I could work with the ${data.listPrice} price point. As an established ${data.city} investor, I offer unique purchase terms that many sellers find attractive - including immediate cash plus structured payments that could provide ongoing income.

I cover all closing costs and full commission. Would you be open to discussing how this approach might benefit your seller?

Best regards,
StudentName`,
    
    v3: (data) => `${data.agentFirstName},

Quick question about ${data.shortAddress} - would your seller consider an alternative to a traditional sale? I can work with the ${data.listPrice} price point through my terms-based purchase program, which includes upfront cash plus structured payments.

I've closed several similar deals in ${data.city}, always covering all costs and commissions. Could we discuss if this might be a good fit?

Thanks,
StudentName`
  }
};

const getRandomVersion = () => `v${Math.floor(Math.random() * 3) + 1}`;

const generateLOI = (property) => {
  const templateData = {
    agentFirstName: getFirstName(property.MLS_Curr_ListAgentName),
    shortAddress: getShortAddress(property.PropertyAddress),
    mortgageBalance: formatCurrency(roundToThousand(property.EstimatedMortgageBalance)),
    listPrice: formatCurrency(property.MLS_Curr_ListPrice),
    city: property.PropertyCity
  };

  const version = property.loiVersion || getRandomVersion();
  const roundedBalance = roundToThousand(property.EstimatedMortgageBalance);
  const ltv = calculateLTV(property.EstimatedMortgageBalance, property.MLS_Curr_ListPrice);

  if (roundedBalance === 0) {
    return LOI_TEMPLATES.noMortgage[version](templateData);
  }
  
  if (ltv > 90) {
    return LOI_TEMPLATES.lowEquity[version](templateData);
  }
  
  return LOI_TEMPLATES.standard[version](templateData);
};

const downloadProcessedCSV = (originalData, processedData) => {
  if (!originalData || !processedData) return;
  
  const enrichedData = originalData.map((row, index) => ({
    ...row,
    LOI_Version: `${processedData[index].templateType} ${processedData[index].loiVersion}`
  }));
  
  const csv = Papa.unparse(enrichedData);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'processed_properties.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default function LOIGenerator() {
  const [data, setData] = useState([]);
  const [originalData, setOriginalData] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        setOriginalData(results.data);
        const processedData = results.data
          .filter(row => row && typeof row === 'object')
          .map(row => {
            const loiVersion = getRandomVersion();
            return {
              ...row,
              ltv: calculateLTV(row.EstimatedMortgageBalance, row.MLS_Curr_ListPrice),
              roundedBalance: roundToThousand(row.EstimatedMortgageBalance),
              loiVersion,
              templateType: roundToThousand(row.EstimatedMortgageBalance) === 0 ? 'No Mortgage' :
                           calculateLTV(row.EstimatedMortgageBalance, row.MLS_Curr_ListPrice) > 90 ? 'Low Equity' : 'Standard'
            };
          });
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
        
        <div className="mb-6 space-y-4">
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
          {data.length > 0 && (
            <Button
              onClick={() => downloadProcessedCSV(originalData, data)}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV with LOI Versions Attached</span>
            </Button>
          )}
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
                  <th className="p-2">Template Type</th>
                  <th className="p-2">Version</th>
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
                    <td className="p-2">{property.templateType}</td>
                    <td className="p-2">{property.loiVersion}</td>
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