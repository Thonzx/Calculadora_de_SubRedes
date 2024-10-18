document.getElementById('subnetForm').addEventListener('submit', function (e) {
    e.preventDefault();
    const ip = document.getElementById('ip').value;
    const cidr = parseInt(document.getElementById('cidr').value);
    const errorMessage = validateInputs(ip, cidr);
    if (errorMessage) {
        document.getElementById('errorMessage').textContent = errorMessage;
        clearResults();
        return;
    }
    try {
        const results = calculateSubnet(ip, cidr);
        if (results.error) {
            document.getElementById('errorMessage').textContent = results.error;
            clearResults();
        } else {
            document.getElementById('errorMessage').textContent = '';
            updateResult('ipClass', results.ipClass);
            updateResult('networkAddress', results.networkAddress);
            updateResult('networkAddressBinary', results.networkAddressBinary);
            updateResult('broadcastAddress', results.broadcastAddress);
            updateResult('broadcastAddressBinary', results.broadcastAddressBinary);
            updateResult('subnetMask', results.subnetMask);
            updateResult('subnetMaskBinary', results.subnetMaskBinary);
            updateResult('cidrNotation', `/${results.cidr}`);
            updateResult('subnetCount', results.subnetCount);
            updateResult('totalHosts', results.totalHosts);
            updateResult('usableHostsRange', results.usableHostsRange);
            currentPage = 1; // Reset page to 1 on new calculation
            subnets = results.subnets;
            displaySubnets();
        }
    } catch (error) {
        document.getElementById('errorMessage').textContent = 'Ocorreu um erro ao calcular a sub-rede.';
        clearResults();
    }
});

function validateInputs(ip, cidr) {
    if (!ip.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
        return 'Endereço IP inválido.';
    }
    const parts = ip.split('.').map(Number);
    if (parts.some(part => part < 0 || part > 255)) {
        return 'Existe octeto com valor fora do intervalo.';
    }
    if (isNaN(cidr) || cidr < 1 || cidr > 32) {
        return 'CIDR inválido.';
    }
    if (parts[0] === 127) {
        return 'Endereço IP reservado para loopback.';
    }
    if (parts.every(part => part === 0)) {
        return 'Endereço IP "tudo zero" é reservado.';
    }
    if (parts[0] === 0) {
        return 'Endereço IP reservado.';
    }
    if (cidr > 0 && cidr < 16) {
        if (parts[1] === 0 && parts[2] === 0 && parts[3] === 0) {
            return 'Endereço de Rede.';
        }else if (parts[1] === 255 && parts[2] === 255 && parts[3] === 255) {
            return 'Endereço de Broadcast.';
        }
    }
    if (cidr > 15 && cidr < 24) {
        if (parts[2] === 0 && parts[3] === 0) {
            return 'Endereço de Rede.';
        }else if (parts[2] === 255 && parts[3] === 255) {
            return 'Endereço de Broadcast.';
        }
    }
    if (cidr > 23 && cidr < 32) {
        if (parts[3] === 0) {
            return 'Endereço de Rede.';
        }else if (parts[3] === 255) {
            return 'Endereço de Broadcast.';
        }
    }
    return null;
}

function clearResults() {
    const resultIds = [
        'ipClass', 'networkAddress', 'networkAddressBinary',
        'broadcastAddress', 'broadcastAddressBinary', 'subnetMask',
        'subnetMaskBinary', 'cidrNotation', 'subnetCount',
        'totalHosts', 'usableHostsRange'
    ];
    resultIds.forEach(id => document.getElementById(id).textContent = '');
    document.getElementById('calculatedSubnets').innerHTML = '';
    document.getElementById('pageInfo').textContent = '';
    document.getElementById('calculatedSubnetsSection').classList.add('hidden'); // Adiciona a classe 'hidden'
}

function updateResult(elementId, value) {
    document.getElementById(elementId).textContent = value;
}

function calculateSubnet(ip, cidr) {
    const [ipClass, error] = getIPClass(ip);
    if (error) {
        return { error };
    }
    const subnetMask = cidrToMask(cidr);
    const subnetMaskBinary = cidrToMaskBinary(cidr);
    const networkAddress = getNetworkAddress(ip, cidr);
    const networkAddressBinary = ipToBinary(networkAddress);
    const broadcastAddress = getBroadcastAddress(networkAddress, cidr);
    const broadcastAddressBinary = ipToBinary(broadcastAddress);
    const totalHosts = calculateTotalHosts(cidr);
    const usableHostsRange = calculateUsableHostsRange(networkAddress, broadcastAddress);
    const subnetCount = calculateSubnetCount(ipClass, cidr);
    const subnets = calculateSubnets(networkAddress, cidr, subnetCount);

    return {
        ipClass,
        subnetMask,
        subnetMaskBinary,
        networkAddress,
        networkAddressBinary,
        broadcastAddress,
        broadcastAddressBinary,
        totalHosts,
        usableHostsRange,
        subnetCount,
        cidr,
        subnets,
        error: null
    };
}

function getIPClass(ip) {
    const firstOctet = parseInt(ip.split('.')[0]);
    if (firstOctet >= 1 && firstOctet <= 126) return ['A'];
    if (firstOctet >= 128 && firstOctet <= 191) return ['B'];
    if (firstOctet >= 192 && firstOctet <= 223) return ['C'];
    if (firstOctet >= 224 && firstOctet <= 239) return ['D'];
    if (firstOctet >= 240 && firstOctet <= 255) return ['E'];
    return [null, 'Endereço IP inválido'];
}

function cidrToMask(cidr) {
    let mask = '';
    for (let i = 0; i < 4; i++) {
        if (cidr >= 8) {
            mask += '255';
        } else {
            mask += (256 - Math.pow(2, 8 - cidr)).toString();
        }
        if (i < 3) {
            mask += '.';
        }
        cidr -= 8;
        if (cidr < 0) cidr = 0;
    }
    return mask;
}

function cidrToMaskBinary(cidr) {
    return cidrToMask(cidr).split('.').map(octet => parseInt(octet).toString(2).padStart(8, '0')).join('.');
}

function getNetworkAddress(ip, cidr) {
    const ipParts = ip.split('.').map(Number);
    const maskParts = cidrToMaskArray(cidr);
    const networkParts = ipParts.map((part, index) => part & maskParts[index]);
    return networkParts.join('.');
}

function getBroadcastAddress(networkAddress, cidr) {
    const hostBits = 32 - cidr;
    const networkAddressBinary = ipToBinary(networkAddress).replace(/\./g, '');
    const broadcastAddressBinary = networkAddressBinary.slice(0, cidr) + '1'.repeat(hostBits);
    return binaryToIp(broadcastAddressBinary);
}

function calculateTotalHosts(cidr) {
    return Math.pow(2, 32 - cidr) - 2;
}

function calculateUsableHostsRange(networkAddress, broadcastAddress) {
    return `${incrementIPAddress(networkAddress)} - ${decrementIPAddress(broadcastAddress)}`;
}

function calculateSubnetCount(ipClass, cidr) {
    const defaultCidr = classToCIDR(ipClass);
    return Math.pow(2, cidr - defaultCidr) || 1;
}

function calculateSubnets(networkAddress, cidr, subnetCount) {
    const subnets = [];
    let currentAddress = networkAddress;
    const increment = Math.pow(2, 32 - cidr);

    for (let i = 0; i < subnetCount; i++) {
        const subnetStart = currentAddress;
        const subnetEnd = incrementIPAddressBy(currentAddress, increment - 1);
        const broadcastAddress = subnetEnd;
        const hostRange = `${incrementIPAddress(subnetStart)} - ${decrementIPAddress(broadcastAddress)}`;

        subnets.push({
            id: i + 1,
            network: subnetStart,
            hostRange: hostRange,
            broadcast: broadcastAddress
        });

        currentAddress = incrementIPAddressBy(currentAddress, increment);
    }

    return subnets;
}

let currentPage = 1;
const itemsPerPage = 10;
let subnets = [];

function displaySubnets() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginatedSubnets = subnets.slice(start, end);

    const calculatedSubnets = document.getElementById('calculatedSubnets');
    calculatedSubnets.innerHTML = '';

    paginatedSubnets.forEach(subnet => {
        const row = `
            <tr>
                <td>${subnet.id}</td>
                <td>${subnet.network}</td>
                <td>${subnet.hostRange}</td>
                <td>${subnet.broadcast}</td>
            </tr>
        `;
        calculatedSubnets.innerHTML += row;
    });

    document.getElementById('pageInfo').textContent = ` ${currentPage} de ${Math.ceil(subnets.length / itemsPerPage)}`;

    // Remove a classe 'hidden' quando houver resultados
    if (subnets.length > 0) {
        document.getElementById('calculatedSubnetsSection').classList.remove('hidden');
    } else {
        document.getElementById('calculatedSubnetsSection').classList.add('hidden');
    }
}

document.getElementById('prevPage').addEventListener('click', function () {
    if (currentPage > 1) {
        currentPage--;
        displaySubnets();
    }
});

document.getElementById('nextPage').addEventListener('click', function () {
    if (currentPage < Math.ceil(subnets.length / itemsPerPage)) {
        currentPage++;
        displaySubnets();
    }
});

function classToCIDR(ipClass) {
    if (ipClass === 'A') return 8;
    if (ipClass === 'B') return 16;
    if (ipClass === 'C') return 24;
    return 0;
}

function cidrToMaskArray(cidr) {
    let mask = [];
    for (let i = 0; i < 4; i++) {
        let bits = Math.min(cidr, 8);
        mask.push(256 - Math.pow(2, 8 - bits));
        cidr -= bits;
    }
    return mask;
}

function ipToBinary(ip) {
    return ip.split('.').map(octet => parseInt(octet).toString(2).padStart(8, '0')).join('.');
}

function binaryToIp(binary) {
    const ipParts = binary.match(/.{1,8}/g).map(bin => parseInt(bin, 2));
    return ipParts.join('.');
}

function incrementIPAddress(ip) {
    const parts = ip.split('.').map(Number);
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] < 255) {
            parts[i]++;
            break;
        } else {
            parts[i] = 0;
        }
    }
    return parts.join('.');
}

function decrementIPAddress(ip) {
    const parts = ip.split('.').map(Number);
    for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i] > 0) {
            parts[i]--;
            break;
        } else {
            parts[i] = 255;
        }
    }
    return parts.join('.');
}

function incrementIPAddressBy(ip, increment) {
    const parts = ip.split('.').map(Number);
    let carry = increment;

    for (let i = parts.length - 1; i >= 0; i--) {
        let sum = parts[i] + carry;
        if (sum > 255) {
            carry = Math.floor(sum / 256);
            parts[i] = sum % 256;
        } else {
            parts[i] = sum;
            carry = 0;
        }
    }
    return parts.join('.');
}
