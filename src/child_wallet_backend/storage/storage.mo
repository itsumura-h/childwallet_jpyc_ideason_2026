import schema "schema";
import HashMap "mo:base/HashMap";
import Principal "mo:base/Principal";
import Array "mo:base/Array";
import Nat32 "mo:base/Nat32";
import Iter "mo:base/Iter";
import Hash "mo:base/Hash";

module {
  // Nat32用のハッシュ関数
  func nat32Hash(n : Nat32) : Hash.Hash {
    Hash.hash(Nat32.toNat(n))
  };

  // ロジックを持つクラス（non-stable）
  public class Storage() {
    public var state : schema.State = {
      publicKeyList = HashMap.HashMap<Principal, schema.PublicKeyListForPerson>(0, Principal.equal, Principal.hash);
      config = {
        env = #Development;
        keyName = "dfx_test_key";
        signCycles = 0;
      };
    };
  };

  // クラスの状態をStableStateから復元するヘルパー関数
  public func restoreFromStable(stableState : schema.StableState) : Storage {
    let storage = Storage();
    
    // stateを新しいvaluesで再構築
    storage.state := {
      publicKeyList = HashMap.HashMap<Principal, schema.PublicKeyListForPerson>(0, Principal.equal, Principal.hash);
      config = stableState.config;
    };
    
    // publicKeyListを復元
    for ((principal, keyEntries) in stableState.publicKeyList.vals()) {
      let personKeyList = HashMap.HashMap<Nat32, [Nat8]>(0, Nat32.equal, nat32Hash);
      for ((key, value) in keyEntries.vals()) {
        personKeyList.put(key, value);
      };
      storage.state.publicKeyList.put(principal, personKeyList);
    };
    
    storage
  };

  // クラスの状態をStableStateに変換するヘルパー関数
  public func toStable(storage : Storage) : schema.StableState {
    let entries = storage.state.publicKeyList.entries();
    let personKeyListEntries = Array.map<(Principal, schema.PublicKeyListForPerson), schema.PersonKeyListEntry>(
      Iter.toArray(entries),
      func((principal, personList) : (Principal, schema.PublicKeyListForPerson)) : schema.PersonKeyListEntry {
        let keyEntries = Array.map<(Nat32, [Nat8]), (Nat32, [Nat8])>(
          Iter.toArray(personList.entries()),
          func((key, value) : (Nat32, [Nat8])) : (Nat32, [Nat8]) {
            (key, value)
          }
        );
        (principal, keyEntries)
      }
    );

    {
      publicKeyList = personKeyListEntries;
      config = storage.state.config;
    }
  };
};
